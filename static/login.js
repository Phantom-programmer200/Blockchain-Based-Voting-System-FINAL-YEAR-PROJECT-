let web3;
let account;
let contract;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D"; // Replace with your contract address
const ADMIN_WALLET = "0xE5c13319e368C6c8b7D744848feF7fE3F13AC340".toLowerCase(); // Replace with actual admin address

// Connect wallet
async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      account = accounts[0];
      web3 = new Web3(window.ethereum);

      document.getElementById(
        "wallet-status"
      ).innerText = `✅ Wallet connected: ${account}`;
      document.getElementById("check-verification-btn").disabled = false;

      // Load ABI and initialize contract
      const response = await fetch("/static/contract_abi.json");
      const abi = await response.json();
      contract = new web3.eth.Contract(abi, contractAddress);
    } catch (error) {
      console.error("Wallet connection failed:", error);
      document.getElementById("wallet-status").innerText =
        "❌ Wallet connection failed";
    }
  } else {
    alert("Please install MetaMask to continue.");
  }
}

// Check verification status
async function checkVoterVerification() {
  try {
    const walletLower = account.toLowerCase();

    // Automatically verify admin
    if (walletLower === ADMIN_WALLET) {
      document.getElementById("verification-status").innerText =
        "✅ Admin wallet automatically verified!";
      document.getElementById("proceed-btn").disabled = false;
      return;
    }

    // For regular users, check status from contract
    const voter = await contract.methods.voters(account).call();

    if (!voter.isRegistered) {
      document.getElementById("verification-status").innerText =
        "❌ You are not registered.";
      document.getElementById("proceed-btn").disabled = true;
    } else if (!voter.isVerified) {
      document.getElementById("verification-status").innerText =
        "⏳ Awaiting admin verification.";
      document.getElementById("proceed-btn").disabled = true;
    } else {
      document.getElementById("verification-status").innerText =
        "✅ You are verified!";
      document.getElementById("proceed-btn").disabled = false;
    }
  } catch (err) {
    console.error("Error checking verification:", err);
    document.getElementById("verification-status").innerText =
      "❌ Verification check failed.";
  }
}

// Proceed based on admin or voter
async function proceedToVote() {
  const response = await fetch("/wallet-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet: account }),
  });

  const result = await response.json();

  if (result.status === "success") {
    if (result.is_admin) {
      window.location.href = "/admin";
    } else {
      window.location.href = "/home";
    }
  } else {
    alert("Login failed.");
  }
}
