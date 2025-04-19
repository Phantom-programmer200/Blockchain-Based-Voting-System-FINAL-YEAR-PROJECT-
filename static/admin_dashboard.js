// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle("light-mode");
  const icon = document.querySelector("#dark-mode-toggle i");
  if (document.body.classList.contains("light-mode")) {
    icon.classList.replace("fa-moon", "fa-sun");
  } else {
    icon.classList.replace("fa-sun", "fa-moon");
  }
}

// Smart Contract Setup
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
let web3;
let contract;

// Connect Wallet
async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      web3 = new Web3(window.ethereum); // Initialize web3 after wallet connection

      const shortAddress = `${accounts[0].substring(
        0,
        6
      )}...${accounts[0].substring(38)}`;
      document.getElementById("wallet-address").textContent = shortAddress;
      document.getElementById("connect-wallet-btn").style.display = "none";

      fetchGasPrice();
    } catch (error) {
      console.error("User rejected request:", error);
    }
  } else {
    alert("Please install MetaMask or a Web3-compatible browser!");
  }
}

// Fetch Gas Price
async function fetchGasPrice() {
  if (!web3) return;
  try {
    const gasPrice = await web3.eth.getGasPrice();
    const gwei = web3.utils.fromWei(gasPrice, "gwei");
    document.getElementById("gasPrice").textContent = `${parseFloat(
      gwei
    ).toFixed(2)} Gwei`;
  } catch (error) {
    console.error("Error fetching gas price:", error);
  }
}

// Load Contract ABI and Fetch Election Data
async function loadContractABI() {
  try {
    const response = await fetch("/static/contract_abi.json");
    const abi = await response.json();

    web3 = new Web3(window.ethereum); // Ensure web3 is initialized
    contract = new web3.eth.Contract(abi, contractAddress);
    console.log("✅ Contract ABI Loaded Successfully");

    fetchElectionData();
  } catch (error) {
    console.error("❌ Error loading contract ABI:", error);
  }
}

// Fetch Election Data
async function fetchElectionData() {
  if (!contract) {
    console.log("⏳ Waiting for contract to load...");
    return;
  }

  try {
    let candidateCount = await contract.methods.candidatesCount().call();
    let voterCount = await contract.methods.voterCount().call();
    let isVotingOpen = await contract.methods.isVotingOpen().call();

    document.getElementById("candidateCount").innerText = candidateCount;
    document.getElementById("voterCount").innerText = voterCount;
    document.getElementById("votingStatus").innerText = isVotingOpen
      ? "Open"
      : "Closed";
  } catch (error) {
    console.error("❌ Error fetching election data:", error);
  }
}

// Reset Election
async function resetElection() {
  try {
    if (!window.ethereum) {
      alert("Please install MetaMask to use this feature.");
      return;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const adminAddress = accounts[0];

    if (!contract) {
      alert("Contract not loaded yet!");
      return;
    }

    contract.methods
      .resetElection()
      .send({ from: adminAddress })
      .on("transactionHash", (hash) => {
        console.log("Transaction sent: ", hash);
        document.getElementById("reset-status").innerText =
          "Transaction sent: " + hash;
      })
      .on("receipt", () => {
        console.log("✅ Election reset successful!");
        alert("✅ Election has been reset!");
      })
      .on("error", (err) => {
        console.error("❌ Error:", err);
        alert("❌ Failed to reset election: " + err.message);
      });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    alert("❌ Failed to reset election: " + err.message);
  }
}

// Initialize Doughnut Chart
function initChart() {
  const ctx = document.getElementById("votesChart").getContext("2d");
  const chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Candidate A", "Candidate B", "Candidate C"],
      datasets: [
        {
          data: [45, 30, 25],
          backgroundColor: ["#00D1FF", "#8A2BE2", "#00FFA3"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#FFFFFF",
          },
        },
      },
    },
  });
}

// Run on page load
window.onload = () => {
  initChart();
  loadContractABI();
  setInterval(fetchGasPrice, 15000); // Update gas price every 15 seconds
};
