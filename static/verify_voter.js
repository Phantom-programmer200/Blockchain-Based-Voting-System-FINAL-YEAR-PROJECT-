// Global variables
let web3;
let contract;
let userAccount = null;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";

// DOM Elements
const connectBtn = document.getElementById("connectWalletBtn");
const statusMessage = document.getElementById("statusMessage");
const voterTableBody = document.getElementById("voterTableBody");
const transactionModal = document.getElementById("transactionModal");
const transactionStatus = document.getElementById("transactionStatus");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Wallet connection
  connectBtn.addEventListener("click", connectWallet);

  // Check if MetaMask is installed
  if (typeof window.ethereum !== "undefined") {
    connectWallet(); // Connect wallet and initialize contract on page load

    // Listen for account changes
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length > 0) {
        userAccount = accounts[0];
        updateWalletStatus(userAccount);
        loadUnverifiedVoters();
      } else {
        userAccount = null;
        updateWalletStatus("Wallet not connected");
        voterTableBody.innerHTML = `
          <tr class="loading-row">
            <td colspan="5">Please connect your wallet to view voter data</td>
          </tr>
        `;
      }
    });
  } else {
    statusMessage.textContent = "⚠️ MetaMask not detected";
    connectBtn.style.display = "none";
    voterTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="5">Please install MetaMask to use this application</td>
      </tr>
    `;
  }
});

// Connect Wallet
async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      connectBtn.innerHTML =
        '<i class="fas fa-circle-notch fa-spin"></i> Connecting...';

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      userAccount = accounts[0];
      updateWalletStatus(userAccount);

      // Initialize Web3 and contract
      web3 = new Web3(window.ethereum);
      const response = await fetch("/static/contract_abi.json");
      const abi = await response.json();
      contract = new web3.eth.Contract(abi, contractAddress);

      connectBtn.style.display = "none";
      await loadUnverifiedVoters();
    } catch (error) {
      console.error("Wallet connection error:", error);
      statusMessage.textContent = "❌ Failed to connect wallet";
      connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect Wallet';
    }
  } else {
    statusMessage.textContent = "⚠️ MetaMask not detected";
    connectBtn.style.display = "none";
  }
}

// Update wallet status
function updateWalletStatus(account) {
  if (account && account.length > 10) {
    statusMessage.textContent = `Connected: ${account.slice(
      0,
      6
    )}...${account.slice(-4)}`;
    statusMessage.innerHTML = `
      <i class="fas fa-check-circle" style="color: var(--accent-green)"></i>
      ${account.slice(0, 6)}...${account.slice(-4)}
    `;
  } else {
    statusMessage.textContent = account;
  }
}

// Load unverified voters
async function loadUnverifiedVoters() {
  voterTableBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="5">
        <div class="loading-spinner">
          <div class="block"></div>
          <div class="block"></div>
          <div class="block"></div>
        </div>
        Loading voter data...
      </td>
    </tr>
  `;

  try {
    const pastEvents = await contract.getPastEvents("VoterRegistered", {
      fromBlock: 0,
      toBlock: "latest",
    });

    voterTableBody.innerHTML = "";

    let hasUnverified = false;

    for (let event of pastEvents) {
      const voterAddress = event.returnValues.voter;
      const voter = await contract.methods.voters(voterAddress).call();

      if (!voter.isVerified) {
        hasUnverified = true;
        const row = document.createElement("tr");

        row.innerHTML = `
          <td>${voterAddress.slice(0, 8)}...${voterAddress.slice(-6)}</td>
          <td>${voter.name || "N/A"}</td>
          <td><a href="https://ipfs.io/ipfs/${
            voter.documentIPFSHash
          }" target="_blank" class="ipfs-link">View Document</a></td>
          <td><span class="status-badge unverified">❌ Unverified</span></td>
          <td><button onclick="verifyVoter('${voterAddress}')" class="verify-btn">Verify Voter</button></td>
        `;

        voterTableBody.appendChild(row);
      }
    }

    if (!hasUnverified) {
      voterTableBody.innerHTML = `
        <tr class="no-voters">
          <td colspan="5">✅ All voters are verified!</td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Error loading voters:", error);
    voterTableBody.innerHTML = `
      <tr class="error-row">
        <td colspan="5">❌ Error loading voter data</td>
      </tr>
    `;
  }
}

// Verify voter
async function verifyVoter(voterAddress) {
  try {
    // Show transaction modal
    transactionModal.classList.add("active");
    transactionStatus.textContent = "Processing verification...";

    // Send transaction
    await contract.methods
      .verifyVoter(voterAddress)
      .send({ from: userAccount })
      .on("transactionHash", (hash) => {
        transactionStatus.textContent = `Transaction sent: ${hash.slice(
          0,
          10
        )}...`;
      });

    // Update status
    statusMessage.innerHTML = `
      <i class="fas fa-check-circle" style="color: var(--accent-green)"></i>
      Voter verified successfully!
    `;

    // Refresh voter list
    await loadUnverifiedVoters();
  } catch (error) {
    console.error("Verification error:", error);
    statusMessage.innerHTML = `
      <i class="fas fa-times-circle" style="color: var(--accent-red)"></i>
      Failed to verify voter
    `;
  } finally {
    transactionModal.classList.remove("active");
  }
}
