let contract;
let web3;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";

// DOM Elements
const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletStatus = document.getElementById("walletStatus");
const positionsContainer = document.getElementById("positionsContainer");
const candidateSelection = document.getElementById("candidateSelection");
const candidateGrid = document.getElementById("candidateGrid");
const backToPositions = document.getElementById("backToPositions");
const selectedPositionTitle = document.getElementById("selectedPositionTitle");
const voteConfirmation = document.getElementById("voteConfirmation");
const selectedCandidatePreview = document.getElementById(
  "selectedCandidatePreview"
);
const cancelVote = document.getElementById("cancelVote");
const confirmVote = document.getElementById("confirmVote");
const voteSuccessModal = document.getElementById("voteSuccessModal");
const transactionInfo = document.getElementById("transactionInfo");
const closeModalBtn = document.getElementById("closeModalBtn");

// State
let currentPosition = null;
let selectedCandidate = null;

// Initialize the voting interface
async function initVoting() {
  // Check if MetaMask is installed
  if (window.ethereum) {
    try {
      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Initialize Web3
      web3 = new Web3(window.ethereum);

      // Load contract ABI
      const response = await fetch("/static/contract_abi.json");
      const abi = await response.json();

      // Initialize contract
      contract = new web3.eth.Contract(abi, contractAddress);

      // Update wallet status
      updateWalletStatus();

      // Load positions
      loadPositions();
    } catch (error) {
      console.error("Error initializing:", error);
      walletStatus.innerHTML =
        '<i class="fas fa-exclamation-circle"></i> Initialization failed';
      walletStatus.classList.add("error");
    }
  } else {
    walletStatus.innerHTML =
      '<i class="fas fa-exclamation-circle"></i> MetaMask not installed';
    walletStatus.classList.add("error");
    connectWalletBtn.style.display = "none";
  }

  // Set up event listeners
  setupEventListeners();
}

// Update wallet connection status
async function updateWalletStatus() {
  try {
    const accounts = await web3.eth.getAccounts();
    if (accounts.length > 0) {
      const shortAddress = `${accounts[0].substring(
        0,
        6
      )}...${accounts[0].substring(38)}`;
      walletStatus.innerHTML = `<i class="fas fa-check-circle"></i> Connected: ${shortAddress}`;
      walletStatus.classList.add("connected");
      connectWalletBtn.innerHTML =
        '<i class="fas fa-wallet"></i> Wallet Connected';
      connectWalletBtn.classList.add("connected");
    } else {
      walletStatus.innerHTML =
        '<i class="fas fa-exclamation-circle"></i> Wallet not connected';
      walletStatus.classList.remove("connected");
      connectWalletBtn.innerHTML =
        '<i class="fas fa-wallet"></i> Connect Wallet';
      connectWalletBtn.classList.remove("connected");
    }
  } catch (error) {
    console.error("Error checking wallet status:", error);
  }
}

// Load positions from contract
async function loadPositions() {
  try {
    // Show loading state
    positionsContainer.innerHTML = `
            <div class="position-card skeleton">
                <div class="position-image"></div>
                <div class="position-info">
                    <div class="line"></div>
                    <div class="line short"></div>
                </div>
            </div>
            <div class="position-card skeleton">
                <div class="position-image"></div>
                <div class="position-info">
                    <div class="line"></div>
                    <div class="line short"></div>
                </div>
            </div>
        `;

    // Get positions from contract
    const positions = await contract.methods.getElectionPositions().call();

    // Clear loading skeletons
    positionsContainer.innerHTML = "";

    if (positions.length === 0) {
      positionsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <h3>No Positions Available</h3>
                    <p>There are currently no election positions available for voting.</p>
                </div>
            `;
      return;
    }

    // Create position cards
    positions.forEach((position) => {
      const positionCard = document.createElement("div");
      positionCard.className = "position-card";
      positionCard.innerHTML = `
                <div class="position-image" style="background-color: ${getPositionColor(
                  position
                )}">
                    <i class="fas fa-landmark"></i>
                </div>
                <div class="position-info">
                    <h3>${position}</h3>
                    <p>View candidates for this position</p>
                </div>
            `;

      // Add click event to load candidates
      positionCard.addEventListener("click", () => {
        currentPosition = position;
        showCandidateSelection(position);
      });

      positionsContainer.appendChild(positionCard);
    });
  } catch (error) {
    console.error("Error loading positions:", error);
    positionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Positions</h3>
                <p>Failed to load election positions. Please try again.</p>
            </div>
        `;
  }
}

// Show candidate selection for a position
async function showCandidateSelection(position) {
  try {
    // Update UI
    document.getElementById("positionSelector").classList.add("hidden");
    candidateSelection.classList.remove("hidden");
    selectedPositionTitle.querySelector("span").textContent = position;

    // Show loading state
    candidateGrid.innerHTML = `
            <div class="candidate-card skeleton">
                <div class="candidate-image"></div>
                <div class="candidate-info">
                    <div class="line"></div>
                    <div class="line short"></div>
                    <div class="line"></div>
                </div>
            </div>
            <div class="candidate-card skeleton">
                <div class="candidate-image"></div>
                <div class="candidate-info">
                    <div class="line"></div>
                    <div class="line short"></div>
                    <div class="line"></div>
                </div>
            </div>
        `;

    // Get candidates for position
    const candidates = await contract.methods
      .getCandidatesByPosition(position)
      .call();

    // Clear loading skeletons
    candidateGrid.innerHTML = "";

    if (candidates.length === 0) {
      candidateGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash"></i>
                    <h3>No Candidates</h3>
                    <p>There are no candidates registered for this position.</p>
                </div>
            `;
      return;
    }

    // Create candidate cards
    candidates.forEach((candidate) => {
      const candidateCard = document.createElement("div");
      candidateCard.className = "candidate-card";
      candidateCard.innerHTML = `
                <div class="candidate-image">
                    <img src="${
                      candidate.imageUrl ||
                      "static/images/default-candidate.jpg"
                    }" alt="${
        candidate.name
      }" onerror="this.src='static/images/default-candidate.jpg'">
                </div>
                <div class="candidate-info">
                    <h3>${candidate.name}</h3>
                    <p>${candidate.description || "No description provided"}</p>
                    <button class="vote-btn" data-candidate-id="${
                      candidate.id
                    }">
                        <i class="fas fa-vote-yea"></i> Vote for ${
                          candidate.name.split(" ")[0]
                        }
                    </button>
                </div>
            `;

      // Add click event to vote button
      const voteBtn = candidateCard.querySelector(".vote-btn");
      voteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showVoteConfirmation(candidate);
      });

      candidateGrid.appendChild(candidateCard);
    });
  } catch (error) {
    console.error(`Error loading candidates for ${position}:`, error);
    candidateGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Error Loading Candidates</h3>
                <p>Failed to load candidates for this position. Please try again.</p>
            </div>
        `;
  }
}

// Show vote confirmation dialog
function showVoteConfirmation(candidate) {
  selectedCandidate = candidate;

  // Update confirmation dialog
  selectedCandidatePreview.innerHTML = `
        <img src="${
          candidate.imageUrl || "static/images/default-candidate.jpg"
        }" alt="${
    candidate.name
  }" onerror="this.src='static/images/default-candidate.jpg'">
        <div class="selected-candidate-info">
            <h4>${candidate.name}</h4>
            <p>${currentPosition}</p>
        </div>
    `;

  // Show confirmation dialog
  voteConfirmation.classList.remove("hidden");
}

// Submit vote to blockchain
async function submitVote() {
  try {
    // Get current account
    const accounts = await web3.eth.getAccounts();
    const voterAddress = accounts[0];

    // Show loading state
    confirmVote.innerHTML =
      '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
    confirmVote.disabled = true;

    // Send vote transaction
    const tx = await contract.methods
      .vote(selectedCandidate.id)
      .send({ from: voterAddress });

    // Hide confirmation dialog
    voteConfirmation.classList.add("hidden");

    // Show success modal
    showVoteSuccess(tx.transactionHash);
  } catch (error) {
    console.error("Error voting:", error);
    alert("Failed to cast vote. Please try again.");

    // Reset button state
    confirmVote.innerHTML = '<i class="fas fa-check"></i> Confirm Vote';
    confirmVote.disabled = false;
  }
}

// Show vote success modal
function showVoteSuccess(txHash) {
  // Update transaction info
  transactionInfo.innerHTML = `
        <i class="fas fa-link"></i>
        <span>Transaction: ${txHash.substring(0, 12)}...${txHash.substring(
    txHash.length - 6
  )}</span>
    `;

  // Show modal
  voteSuccessModal.classList.remove("hidden");
}

// Generate color based on position name
function getPositionColor(position) {
  const colors = [
    "rgba(26, 82, 118, 0.8)",
    "rgba(230, 126, 34, 0.8)",
    "rgba(39, 174, 96, 0.8)",
    "rgba(52, 152, 219, 0.8)",
    "rgba(241, 196, 15, 0.8)",
  ];

  // Simple hash to get consistent color for each position
  let hash = 0;
  for (let i = 0; i < position.length; i++) {
    hash = position.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Set up event listeners
function setupEventListeners() {
  // Connect wallet button
  connectWalletBtn.addEventListener("click", async () => {
    if (!web3) {
      await initVoting();
    } else {
      // In a real app, you might want to disconnect or show account info
      const accounts = await web3.eth.getAccounts();
      alert(`Connected to: ${accounts[0]}`);
    }
  });

  // Back to positions button
  backToPositions.addEventListener("click", () => {
    candidateSelection.classList.add("hidden");
    document.getElementById("positionSelector").classList.remove("hidden");
    currentPosition = null;
  });

  // Cancel vote button
  cancelVote.addEventListener("click", () => {
    voteConfirmation.classList.add("hidden");
    selectedCandidate = null;
  });

  // Confirm vote button
  confirmVote.addEventListener("click", submitVote);

  // Close modal button
  closeModalBtn.addEventListener("click", () => {
    voteSuccessModal.classList.add("hidden");

    // Return to positions view
    candidateSelection.classList.add("hidden");
    document.getElementById("positionSelector").classList.remove("hidden");
    currentPosition = null;
    selectedCandidate = null;
  });

  // Handle account changes
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        // Wallet disconnected
        walletStatus.innerHTML =
          '<i class="fas fa-exclamation-circle"></i> Wallet disconnected';
        walletStatus.classList.remove("connected");
        connectWalletBtn.innerHTML =
          '<i class="fas fa-wallet"></i> Connect Wallet';
        connectWalletBtn.classList.remove("connected");
      } else {
        // Account changed
        updateWalletStatus();
      }
    });
  }
}

// Initialize the voting interface when page loads
window.addEventListener("load", initVoting);
