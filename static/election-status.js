const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
let web3;
let contract;
let currentAccount;
let countdownInterval;

// DOM Elements
const connectBtn = document.getElementById("connectWalletBtn");
const walletAddress = document.getElementById("walletAddress");
const statusCard = document.getElementById("statusCard");
const electionStatus = document.getElementById("electionStatus");
const votingTime = document.getElementById("votingTime");
const countdownContainer = document.getElementById("countdownContainer");
const resultsContainer = document.getElementById("resultsContainer");
const resultsList = document.getElementById("resultsList");
const transactionModal = document.getElementById("transactionModal");
const transactionStatus = document.getElementById("transactionStatus");

// Countdown elements
const daysElement = document.getElementById("days");
const hoursElement = document.getElementById("hours");
const minutesElement = document.getElementById("minutes");
const secondsElement = document.getElementById("seconds");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  connectBtn.addEventListener("click", connectWallet);
  loadElectionStatus();
});

// Connect Wallet
async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      connectBtn.innerHTML =
        '<i class="fas fa-circle-notch fa-spin"></i> Connecting...';

      web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      currentAccount = accounts[0];

      walletAddress.innerHTML = `
        <i class="fas fa-check-circle" style="color: var(--accent-green)"></i>
        ${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}
      `;

      connectBtn.style.display = "none";

      await loadElectionStatus();
    } catch (error) {
      console.error("Wallet connection error:", error);
      connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect Wallet';
    }
  } else {
    walletAddress.textContent = "MetaMask not detected";
    connectBtn.style.display = "none";
  }
}

// Load Election Status
async function loadElectionStatus() {
  try {
    electionStatus.innerHTML =
      '<i class="fas fa-spinner fa-pulse"></i> Loading election status...';
    transactionModal.classList.add("active");
    transactionStatus.textContent = "Connecting to blockchain...";

    if (!web3 && typeof window.ethereum !== "undefined") {
      web3 = new Web3(window.ethereum);
    }

    const response = await fetch("static/contract_abi.json");
    const abi = await response.json();
    contract = new web3.eth.Contract(abi, contractAddress);

    const votingStart = await contract.methods.votingStart().call();
    const votingEnd = await contract.methods.votingEnd().call();
    const currentTime = Math.floor(Date.now() / 1000);

    const startDate = new Date(votingStart * 1000);
    const endDate = new Date(votingEnd * 1000);
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    votingTime.textContent = `Voting Period: ${startDate.toLocaleString(
      undefined,
      options
    )} → ${endDate.toLocaleString(undefined, options)}`;

    if (currentTime < votingStart) {
      electionStatus.innerHTML =
        '<i class="fas fa-hourglass-start"></i> Voting has not started yet';
      statusCard.style.borderLeftColor = "var(--accent-blue)";
      startCountdown(votingStart, "Voting starts in");
    } else if (currentTime >= votingStart && currentTime <= votingEnd) {
      electionStatus.innerHTML =
        '<i class="fas fa-vote-yea"></i> Voting is currently ongoing';
      statusCard.style.borderLeftColor = "var(--accent-green)";
      startCountdown(votingEnd, "Voting ends in");
    } else {
      electionStatus.innerHTML =
        '<i class="fas fa-flag-checkered"></i> Voting has ended';
      statusCard.style.borderLeftColor = "var(--accent-purple)";
      countdownContainer.style.display = "none";
      await showElectionResults();
    }

    transactionModal.classList.remove("active");
  } catch (error) {
    console.error("Error loading election status:", error);
    electionStatus.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i> Failed to load election status';
    statusCard.style.borderLeftColor = "var(--accent-red)";
    transactionModal.classList.remove("active");
  }
}

// Countdown Timer
function startCountdown(targetTime, prefix) {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownContainer.style.display = "block";
  countdownContainer.querySelector("h4").textContent = prefix;

  function updateCountdown() {
    const now = Math.floor(Date.now() / 1000);
    const diff = targetTime - now;

    if (diff <= 0) {
      clearInterval(countdownInterval);
      loadElectionStatus();
      return;
    }

    const days = Math.floor(diff / (60 * 60 * 24));
    const hours = Math.floor((diff % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((diff % (60 * 60)) / 60);
    const seconds = Math.floor(diff % 60);

    daysElement.textContent = days.toString().padStart(2, "0");
    hoursElement.textContent = hours.toString().padStart(2, "0");
    minutesElement.textContent = minutes.toString().padStart(2, "0");
    secondsElement.textContent = seconds.toString().padStart(2, "0");
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

// Show Election Results
async function showElectionResults() {
  resultsContainer.style.display = "block";
  resultsList.innerHTML =
    '<li class="loading-result"><i class="fas fa-spinner fa-pulse"></i> Loading results...</li>';

  try {
    const electionId = await contract.methods.electionCounter().call();
    const results = await contract.methods
      .getElectionResults(electionId)
      .call();
    resultsList.innerHTML = "";

    if (results.length === 0) {
      resultsList.innerHTML = `
        <li><i class="fas fa-question-circle"></i> No results found for this election</li>
      `;
      return;
    }

    for (const result of results) {
      const { position, winnerName, voteCount } = result;

      const resultItem = document.createElement("li");
      resultItem.innerHTML = `
        <i class="fas fa-trophy"></i>
        <span><strong>${position}:</strong> ${winnerName} with ${voteCount} vote(s)</span>
      `;
      resultsList.appendChild(resultItem);
    }
  } catch (error) {
    console.error("Error loading results:", error);
    resultsList.innerHTML = `
      <li class="loading-result">
        <i class="fas fa-exclamation-triangle"></i> Failed to load results
      </li>
    `;
  }
}
