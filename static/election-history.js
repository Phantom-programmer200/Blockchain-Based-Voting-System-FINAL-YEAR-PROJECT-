const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
let abi;
let web3;
let contract;
let currentAccount;
let isAdmin = false;

// DOM Elements
const connectButton = document.getElementById("connectButton");
const storeResultsButton = document.getElementById("storeResultsButton");
const walletAddress = document.getElementById("walletAddress");
const electionHistory = document.getElementById("electionHistory");
const transactionModal = document.getElementById("transactionModal");
const transactionStatus = document.getElementById("transactionStatus");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  connectButton.addEventListener("click", connectMetaMask);
  storeResultsButton.addEventListener("click", storeResults);
  loadABI();
});

// Load Contract ABI
async function loadABI() {
  try {
    showLoading("Loading contract interface...");
    const response = await fetch("/static/contract_abi.json");
    abi = await response.json();
    hideLoading();
  } catch (error) {
    console.error("Error loading ABI:", error);
    showError("Unable to load contract interface");
  }
}

// Connect to MetaMask
async function connectMetaMask() {
  if (window.ethereum) {
    try {
      showLoading("Connecting to MetaMask...");
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      currentAccount = accounts[0];

      // Initialize Web3 and contract
      web3 = new Web3(window.ethereum);
      contract = new web3.eth.Contract(abi, contractAddress);

      // Update UI
      updateWalletStatus();
      connectButton.disabled = true;
      connectButton.innerHTML = '<i class="fas fa-check-circle"></i> Connected';

      // Check admin status
      isAdmin = await contract.methods.isAdmin().call({ from: currentAccount });
      if (isAdmin) {
        storeResultsButton.classList.remove("hidden");
      }

      // Load election history
      await loadElectionHistory();
      hideLoading();

      // Listen for account changes
      window.ethereum.on("accountsChanged", handleAccountsChanged);
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      showError("Connection failed. Please try again.");
    }
  } else {
    showError("MetaMask not found! Please install MetaMask.");
  }
}

// Handle account changes
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    currentAccount = null;
    walletAddress.textContent = "Not connected";
    connectButton.disabled = false;
    connectButton.innerHTML = '<i class="fas fa-plug"></i> Connect Wallet';
    storeResultsButton.classList.add("hidden");
    electionHistory.innerHTML = `
      <div class="loading-history">
        <p>Please connect your wallet to view election history</p>
      </div>
    `;
  } else if (accounts[0] !== currentAccount) {
    currentAccount = accounts[0];
    updateWalletStatus();
    loadElectionHistory();
  }
}

// Update wallet status display
function updateWalletStatus() {
  walletAddress.innerHTML = `
    <i class="fas fa-check-circle" style="color: var(--accent-green)"></i>
    ${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}
  `;
}

// Load election history
async function loadElectionHistory() {
  try {
    showLoading("Loading election history...");

    const electionCount = await contract.methods.electionCounter().call();
    electionHistory.innerHTML = "";

    if (electionCount == 0) {
      electionHistory.innerHTML = `
        <div class="loading-history">
          <p>No election history found</p>
        </div>
      `;
      return;
    }

    for (let i = 1; i <= electionCount; i++) {
      const electionResults = await contract.methods
        .getElectionResults(i)
        .call();

      electionResults.forEach((result) => {
        const electionDiv = document.createElement("div");
        electionDiv.className = "election-card";

        const winnerAddressDisplay = result.winnerAddress
          ? `${result.winnerAddress.slice(0, 8)}...${result.winnerAddress.slice(
              -6
            )}`
          : "Not available";

        electionDiv.innerHTML = `
          <h3><i class="fas fa-vote-yea"></i> Election ${result.electionId} - ${
          result.position
        }</h3>
          <p><strong>Winner:</strong> ${
            result.winnerName || "Not available"
          }</p>
          <p><strong>Votes:</strong> ${result.voteCount}</p>
          ${
            result.winnerName && result.winnerAddress
              ? `<p><strong>Winning Address:</strong> ${winnerAddressDisplay}</p>`
              : ""
          }
        `;

        electionHistory.appendChild(electionDiv);
      });
    }

    hideLoading();
  } catch (error) {
    console.error("Error loading election history:", error);
    showError("Failed to load election history");
  }
}

// Store results (admin only)
async function storeResults() {
  if (!confirm("Are you sure you want to store the current election results?"))
    return;

  try {
    showTransactionModal("Storing election results...");

    await contract.methods
      .storeElectionResults()
      .send({ from: currentAccount })
      .on("transactionHash", (hash) => {
        transactionStatus.textContent = `Transaction sent: ${hash.slice(
          0,
          10
        )}...`;
      });

    await loadElectionHistory();
    hideTransactionModal();
    alert("Election results stored successfully!");
  } catch (error) {
    console.error("Error storing results:", error);
    showError("Failed to store results. You may not have permission.");
    hideTransactionModal();
  }
}

// UI Helpers
function showLoading(message) {
  electionHistory.innerHTML = `
    <div class="loading-history">
      <div class="blockchain-loader">
        <div class="block"></div>
        <div class="block"></div>
        <div class="block"></div>
      </div>
      <p>${message}</p>
    </div>
  `;
}

function showError(message) {
  electionHistory.innerHTML = `
    <div class="loading-history">
      <i class="fas fa-exclamation-triangle" style="color: var(--accent-red)"></i>
      <p>${message}</p>
    </div>
  `;
  hideLoading();
}

function showTransactionModal(message) {
  transactionStatus.textContent = message;
  transactionModal.classList.add("active");
}

function hideTransactionModal() {
  transactionModal.classList.remove("active");
}

function hideLoading() {
  // Optional: additional logic can be added here if needed
}
