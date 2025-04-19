const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
let abi;
let web3;
let contract;
let allWinners = new Set();
let totalVotes = 0;

// DOM Elements
const connectButton = document.getElementById("connectButton");
const electionHistoryDiv = document.getElementById("electionHistory");
const totalElectionsEl = document.getElementById("totalElections");
const uniqueWinnersEl = document.getElementById("uniqueWinners");
const totalVotesEl = document.getElementById("totalVotes");
const networkStatus = document.querySelector(".status-indicator");
const networkStatusText = document.getElementById("networkStatusText");

// Unique Features
function createConfetti() {
  const colors = [
    "var(--primary-blue)",
    "var(--accent-orange)",
    "var(--success-green)",
    "var(--highlight-yellow)",
    "var(--light-blue)",
    "var(--error-red)",
  ];

  const container = document.getElementById("confetti-container");
  container.innerHTML = "";

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
    confetti.style.width = `${Math.random() * 10 + 5}px`;
    confetti.style.height = confetti.style.width;

    container.appendChild(confetti);

    const animationDuration = Math.random() * 3 + 2;

    confetti.style.animation = `fall ${animationDuration}s linear forwards`;

    // Create keyframes for each confetti
    const keyframes = `
            @keyframes fall {
                to {
                    transform: translateY(100vh) rotate(${
                      Math.random() * 360
                    }deg);
                    opacity: 0;
                }
            }
        `;

    const style = document.createElement("style");
    style.innerHTML = keyframes;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    container.innerHTML = "";
  }, 3000);
}

async function loadABI() {
  try {
    const response = await fetch("/static/contract_abi.json");
    const data = await response.json();
    abi = data;
    updateNetworkStatus(false);
  } catch (error) {
    console.error("Error loading ABI:", error);
    updateNetworkStatus(false, "ABI Load Failed");
  }
}

function updateNetworkStatus(connected, message = "") {
  if (connected) {
    networkStatus.classList.add("connected");
    networkStatus.classList.remove("disconnected");
    networkStatusText.textContent = message || "Connected to Blockchain";
  } else {
    networkStatus.classList.remove("connected");
    networkStatus.classList.add("disconnected");
    networkStatusText.textContent = message || "Disconnected";
  }
}

async function connectMetaMask() {
  if (window.ethereum) {
    try {
      connectButton.innerHTML =
        '<span class="loading-spinner"></span> Connecting...';

      await ethereum.request({ method: "eth_requestAccounts" });
      web3 = new Web3(window.ethereum);
      contract = new web3.eth.Contract(abi, contractAddress);

      connectButton.disabled = true;
      connectButton.innerHTML =
        '<span class="button-icon">🔗</span> <span class="button-text">Connected</span>';

      updateNetworkStatus(true, "Connected to MetaMask");
      createConfetti();

      await loadElectionHistory();

      // Listen for account changes
      ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          updateNetworkStatus(false, "Disconnected");
          connectButton.disabled = false;
          connectButton.innerHTML =
            '<span class="button-icon">🔗</span> <span class="button-text">Connect MetaMask</span>';
        } else {
          loadElectionHistory();
        }
      });
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      connectButton.innerHTML =
        '<span class="button-icon">🔗</span> <span class="button-text">Connect MetaMask</span>';
      updateNetworkStatus(false, "Connection Failed");
    }
  } else {
    alert("MetaMask not found! Please install MetaMask.");
    updateNetworkStatus(false, "MetaMask Not Found");
  }
}

async function loadElectionHistory() {
  if (!abi) {
    console.error("ABI not loaded yet.");
    return;
  }

  try {
    electionHistoryDiv.innerHTML =
      '<div class="loading-message">Loading election history...</div>';

    const electionCount = await contract.methods.electionCounter().call();
    totalElectionsEl.textContent = electionCount;

    allWinners.clear();
    totalVotes = 0;
    electionHistoryDiv.innerHTML = "";

    let allElections = [];

    // First collect all elections
    for (let i = 1; i <= electionCount; i++) {
      const electionResults = await contract.methods
        .getElectionResults(i)
        .call();
      allElections.push(...electionResults);
    }

    // Sort by electionId (newest first)
    allElections.sort((a, b) => b.electionId - a.electionId);

    // Process and display
    allElections.forEach((result, index) => {
      allWinners.add(result.winnerName);
      totalVotes += parseInt(result.voteCount);

      const electionCard = document.createElement("div");
      electionCard.className = "election-card fade-in";
      electionCard.style.animationDelay = `${index * 0.1}s`;

      electionCard.innerHTML = `
                <h3>Election #${result.electionId} - ${result.position}</h3>
                <p><strong>Winner:</strong> <span class="winner-name">${
                  result.winnerName
                }</span></p>
                <p><strong>Votes:</strong> <span class="vote-count">${
                  result.voteCount
                }</span></p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            `;

      electionCard.addEventListener("click", () => {
        createConfetti();
      });

      electionHistoryDiv.appendChild(electionCard);
    });

    uniqueWinnersEl.textContent = allWinners.size;
    totalVotesEl.textContent = totalVotes;
  } catch (error) {
    console.error(error);
    electionHistoryDiv.innerHTML =
      '<div class="error-message">Error loading election history. Please try again.</div>';
    updateNetworkStatus(false, "Load Error");
  }
}

// Event Listeners
connectButton.addEventListener("click", connectMetaMask);

// Initialize
window.addEventListener("load", () => {
  loadABI();

  // Check if already connected
  if (window.ethereum && window.ethereum.selectedAddress) {
    connectButton.click();
  }
});
