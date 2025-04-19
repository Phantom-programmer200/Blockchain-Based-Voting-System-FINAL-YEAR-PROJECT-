// Initialize Web3 and Contract
let web3;
let contract;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";

// DOM Elements
const connectWalletBtn = document.getElementById("connectWalletBtn");
const logoutBtn = document.getElementById("logoutBtn");
const walletInfo = document.getElementById("walletInfo");
const walletAddress = document.querySelector(".wallet-address");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const totalVotesElement = document.getElementById("totalVotes");
const registeredVotersElement = document.getElementById("registeredVoters");
const totalCandidatesElement = document.getElementById("totalCandidates");
const countdownTimerElement = document.getElementById("countdownTimer");

// Chart Initialization
let votingActivityChart;

// Initialize the dashboard
async function initDashboard() {
  // Check if wallet is already connected
  if (window.ethereum && window.ethereum.selectedAddress) {
    await connectWallet();
  }

  // Initialize chart
  initVotingActivityChart();

  // Load contract data
  if (contract) {
    updateContractData();
  }

  // Set up event listeners
  setupEventListeners();
}

// Connect wallet function
async function connectWallet() {
  try {
    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Initialize Web3
    web3 = new Web3(window.ethereum);

    // Load contract ABI
    const response = await fetch("/static/contract_abi.json");
    const contractABI = await response.json();

    // Initialize contract
    contract = new web3.eth.Contract(contractABI, contractAddress);

    // Update UI
    const accounts = await web3.eth.getAccounts();
    const shortAddress = `${accounts[0].substring(
      0,
      6
    )}...${accounts[0].substring(38)}`;
    walletAddress.textContent = shortAddress;
    walletInfo.title = accounts[0];
    connectWalletBtn.style.display = "none";

    // Update contract data
    updateContractData();

    console.log("Wallet connected successfully");
  } catch (error) {
    console.error("Error connecting wallet:", error);
    alert("Failed to connect wallet. Please try again.");
  }
}

// Update contract data
async function updateContractData() {
  try {
    // Get total votes
    const totalVotes = await contract.methods.totalVotes().call();
    totalVotesElement.textContent = totalVotes;

    // Get registered voters count
    const registeredVoters = await contract.methods.voterCount().call();
    registeredVotersElement.textContent = registeredVoters;

    // Get total candidates (example - adjust based on your contract)
    const totalCandidates = await contract.methods.candidateCount().call();
    totalCandidatesElement.textContent = totalCandidates;

    // Update countdown timer
    updateCountdownTimer();

    // Update chart data
    updateChartData();
  } catch (error) {
    console.error("Error fetching contract data:", error);
  }
}

// Update countdown timer
async function updateCountdownTimer() {
  try {
    const votingEnd = await contract.methods.votingEnd().call();
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = votingEnd - now;

    if (timeLeft <= 0) {
      countdownTimerElement.textContent = "Voting has ended";
      return;
    }

    // Update every second
    setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = votingEnd - now;

      if (timeLeft <= 0) {
        countdownTimerElement.textContent = "Voting has ended";
        return;
      }

      const days = Math.floor(timeLeft / (60 * 60 * 24));
      const hours = Math.floor((timeLeft % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
      const seconds = Math.floor(timeLeft % 60);

      countdownTimerElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
  } catch (error) {
    console.error("Error updating countdown:", error);
    countdownTimerElement.textContent = "Error loading timer";
  }
}

// Initialize voting activity chart
function initVotingActivityChart() {
  const ctx = document.getElementById("votingActivityChart").getContext("2d");

  votingActivityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Votes Cast",
          data: [12, 19, 3, 5, 2, 3],
          backgroundColor: "rgba(26, 82, 118, 0.2)",
          borderColor: "rgba(26, 82, 118, 1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
    },
  });
}

// Update chart data (example - replace with real data)
async function updateChartData() {
  // In a real app, you would fetch this data from your contract
  const newData = [15, 22, 8, 12, 7, 10];
  votingActivityChart.data.datasets[0].data = newData;
  votingActivityChart.update();
}

// Set up event listeners
function setupEventListeners() {
  // Connect wallet button
  connectWalletBtn.addEventListener("click", connectWallet);

  // Logout button
  logoutBtn.addEventListener("click", () => {
    // In a real dApp, you would handle proper logout
    window.location.reload();
  });

  // Sidebar toggle
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("expanded");
  });

  // Handle window resize for responsive sidebar
  window.addEventListener("resize", handleResponsiveSidebar);
}

// Handle responsive sidebar
function handleResponsiveSidebar() {
  if (window.innerWidth < 992) {
    sidebar.classList.remove("expanded");
  }
}

// Initialize the dashboard when the page loads
window.addEventListener("load", initDashboard);

// Handle account changes
if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      // Wallet disconnected
      window.location.reload();
    } else {
      // Account changed
      const shortAddress = `${accounts[0].substring(
        0,
        6
      )}...${accounts[0].substring(38)}`;
      walletAddress.textContent = shortAddress;
      walletInfo.title = accounts[0];
      updateContractData();
    }
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}
