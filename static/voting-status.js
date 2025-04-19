const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
let abi;
let web3;
let contract;
let votingActivityChart;

// DOM Elements
const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletInfo = document.getElementById("walletInfo");
const walletAddress = document.querySelector(".wallet-address");
const votingStatusElement = document.getElementById("votingStatus");
const votingTimeElement = document.getElementById("votingTime");
const positionsListElement = document.getElementById("positionsList");
const positionsCountElement = document.getElementById("positionsCount");
const candidatesElement = document.getElementById("candidates");

// Initialize the page
async function initVotingStatus() {
  // Load ABI first
  await loadABI();

  // Check if wallet is already connected
  if (window.ethereum && window.ethereum.selectedAddress) {
    await connectWallet();
  }

  // Initialize chart
  initVotingActivityChart();

  // Set up event listeners
  setupEventListeners();
}

// Load contract ABI
async function loadABI() {
  try {
    const response = await fetch("/static/contract_abi.json");
    abi = await response.json();
    console.log("ABI loaded successfully");
  } catch (error) {
    console.error("Error loading ABI:", error);
    showError("Failed to load contract ABI. Please refresh the page.");
  }
}

// Connect wallet function
async function connectWallet() {
  try {
    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" });

    // Initialize Web3
    web3 = new Web3(window.ethereum);

    // Initialize contract
    contract = new web3.eth.Contract(abi, contractAddress);

    // Update UI
    const accounts = await web3.eth.getAccounts();
    const shortAddress = `${accounts[0].substring(
      0,
      6
    )}...${accounts[0].substring(38)}`;
    if (walletAddress) {
      walletAddress.textContent = shortAddress;
    }
    if (walletInfo) {
      walletInfo.title = accounts[0];
    }

    // Load voting status
    loadVotingStatus();

    console.log("Wallet connected successfully");
  } catch (error) {
    console.error("Error connecting wallet:", error);
    showError("Failed to connect wallet. Please try again.");
  }
}

// Load voting status from contract
async function loadVotingStatus() {
  try {
    // Show loading state
    votingStatusElement.innerHTML =
      '<div class="spinner"></div><span>Checking voting status...</span>';
    votingTimeElement.innerHTML =
      '<div class="spinner"></div><span>Loading...</span>';

    // Get voting status
    const votingOpen = await contract.methods.isVotingOpen().call();
    const votingStart = await contract.methods.votingStart().call();
    const votingEnd = await contract.methods.votingEnd().call();

    // Update voting status display
    updateVotingStatusUI(votingOpen, votingEnd);

    // Get positions and candidates
    const positions = await contract.methods.getElectionPositions().call();
    updatePositionsList(positions);

    // Load candidates for each position
    loadCandidates(positions);
  } catch (error) {
    console.error("Error loading voting status:", error);
    showError("Failed to load voting data. Please try again.");
  }
}

// Update voting status UI
function updateVotingStatusUI(votingOpen, votingEnd) {
  // Update status indicator
  const now = Math.floor(Date.now() / 1000); // Number
  const votingEndNumber = Number(votingEnd); // Convert BigInt to Number
  const remainingTime = votingEndNumber - now;

  if (votingOpen) {
    votingStatusElement.className = "status-indicator active";
    votingStatusElement.innerHTML =
      '<i class="fas fa-check-circle"></i><span>Voting is OPEN</span>';
  } else {
    votingStatusElement.className = "status-indicator closed";
    votingStatusElement.innerHTML =
      '<i class="fas fa-times-circle"></i><span>Voting is CLOSED</span>';
  }

  // Update countdown timer
  updateCountdownTimer(votingEndNumber);
}

// Update countdown timer
function updateCountdownTimer(votingEnd) {
  const now = Math.floor(Date.now() / 1000);
  let remainingTime = votingEnd - now;

  if (remainingTime <= 0) {
    votingTimeElement.textContent = "Voting period has ended";
    votingTimeElement.className = "countdown";
    return;
  }

  // Update immediately
  updateTimerDisplay(remainingTime);

  // Update every second
  const timerInterval = setInterval(() => {
    remainingTime -= 1;

    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      votingTimeElement.textContent = "Voting period has ended";
      votingStatusElement.className = "status-indicator closed";
      votingStatusElement.innerHTML =
        '<i class="fas fa-times-circle"></i><span>Voting is CLOSED</span>';
      return;
    }

    updateTimerDisplay(remainingTime);
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let displayText = "";
  if (days > 0) displayText += `${days}d `;
  if (hours > 0 || days > 0) displayText += `${hours}h `;
  displayText += `${minutes}m ${secs}s`;

  votingTimeElement.textContent = displayText;
  votingTimeElement.className =
    seconds < 86400 ? "countdown urgent" : "countdown"; // < 24 hours = urgent
}

// Update positions list
function updatePositionsList(positions) {
  positionsListElement.innerHTML = "";
  positionsCountElement.textContent = `${positions.length} positions`;

  positions.forEach((position) => {
    const positionItem = document.createElement("div");
    positionItem.className = "position-item";
    positionItem.innerHTML = `
            <span>${position}</span>
            <span class="badge">Position</span>
        `;
    positionsListElement.appendChild(positionItem);
  });
}

// Load candidates for each position
async function loadCandidates(positions) {
  candidatesElement.innerHTML = "";

  for (const position of positions) {
    try {
      const candidates = await contract.methods
        .getCandidatesByPosition(position)
        .call();

      candidates.forEach((candidate) => {
        const candidateCard = document.createElement("div");
        candidateCard.className = "candidate-card";
        candidateCard.innerHTML = `
                    <div class="candidate-image">
                        <img src="${
                          candidate.imageUrl ||
                          "static/images/default-candidate.jpg"
                        }" alt="${candidate.name}">
                    </div>
                    <div class="candidate-info">
                        <h3 class="candidate-name">${candidate.name}</h3>
                        <p class="candidate-position">${position}</p>
                        <div class="candidate-votes">
                            <span class="vote-count">${
                              candidate.voteCount
                            } votes</span>
                            <button class="vote-btn" data-candidate-id="${
                              candidate.id
                            }">
                                <i class="fas fa-vote-yea"></i> Vote
                            </button>
                        </div>
                    </div>
                `;
        candidatesElement.appendChild(candidateCard);
      });
    } catch (error) {
      console.error(`Error loading candidates for ${position}:`, error);
    }
  }

  // If no candidates found
  if (candidatesElement.children.length === 0) {
    candidatesElement.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-exclamation-circle"></i>
                <p>No candidates found for current election</p>
            </div>
        `;
  }
}

// Initialize voting activity chart
function initVotingActivityChart() {
  const ctx = document.getElementById("votingActivityChart").getContext("2d");

  votingActivityChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Presidential", "Governor", "Senate", "House", "Local"],
      datasets: [
        {
          label: "Votes Cast",
          data: [1200, 900, 750, 600, 400],
          backgroundColor: "rgba(26, 82, 118, 0.7)",
          borderColor: "rgba(26, 82, 118, 1)",
          borderWidth: 1,
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
          beginAtZero: true,
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

// Show error message
function showError(message) {
  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

  // You might want to add this to a specific error container in your UI
  document.body.prepend(errorElement);

  // Remove after some time
  setTimeout(() => {
    errorElement.remove();
  }, 5000);
}

// Set up event listeners
function setupEventListeners() {
  // Connect wallet button
  connectWalletBtn.addEventListener("click", connectWallet);

  // Handle vote button clicks (delegated event)
  candidatesElement.addEventListener("click", (e) => {
    if (e.target.closest(".vote-btn")) {
      const candidateId = e.target.closest(".vote-btn").dataset.candidateId;
      handleVote(candidateId);
    }
  });

  // Handle time filter buttons
  document.querySelectorAll(".time-filter button").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelector(".time-filter button.active")
        .classList.remove("active");
      button.classList.add("active");
      // In a real app, you would update the chart data here
    });
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    if (votingActivityChart) {
      votingActivityChart.resize();
    }
  });
}

// Handle vote action
async function handleVote(candidateId) {
  if (!contract || !web3) {
    alert("Please connect your wallet first");
    return;
  }

  try {
    const accounts = await web3.eth.getAccounts();

    // Show loading state on the button
    const voteBtn = document.querySelector(
      `.vote-btn[data-candidate-id="${candidateId}"]`
    );
    const originalText = voteBtn.innerHTML;
    voteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    voteBtn.disabled = true;

    // Send vote transaction
    await contract.methods.vote(candidateId).send({ from: accounts[0] });

    // Update UI after successful vote
    voteBtn.innerHTML = '<i class="fas fa-check"></i> Voted!';

    // Refresh candidate data after a short delay
    setTimeout(() => {
      const positions = Array.from(
        document.querySelectorAll(".position-item span:first-child")
      ).map((el) => el.textContent);
      loadCandidates(positions);
    }, 2000);
  } catch (error) {
    console.error("Error voting:", error);
    alert("Failed to cast vote. Please try again.");

    // Reset button state
    const voteBtn = document.querySelector(
      `.vote-btn[data-candidate-id="${candidateId}"]`
    );
    if (voteBtn) {
      voteBtn.innerHTML = originalText;
      voteBtn.disabled = false;
    }
  }
}

// Initialize the page when loaded
window.addEventListener("load", initVotingStatus);

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
      loadVotingStatus();
    }
  });

  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });
}
