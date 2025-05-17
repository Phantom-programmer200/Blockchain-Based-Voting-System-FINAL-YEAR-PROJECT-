const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
let web3;
let contract;
let abi;

// DOM Elements
const connectButton = document.getElementById("connectWallet");
const walletStatus = document.querySelector(".wallet-status .status-dot");
const walletStatusText = document.querySelector(".wallet-status .status-text");
const votingStatus = document.querySelector(".voting-status .status-indicator");
const votingStatusText = document.querySelector(".voting-status .status-text");
const resultsContainer = document.getElementById("resultsContainer");
const totalVotesEl = document.getElementById("totalVotes");
const totalCandidatesEl = document.getElementById("totalCandidates");
const totalPositionsEl = document.getElementById("totalPositions");
const confettiContainer = document.getElementById("confettiContainer");

// Load ABI
async function loadABI() {
  try {
    const response = await fetch("/static/contract_abi.json");
    abi = await response.json();
    console.log("ABI loaded successfully");
  } catch (error) {
    console.error("Error loading ABI:", error);
    showError("Failed to load contract ABI");
  }
}

// Connect Wallet
async function connectWallet() {
  if (window.ethereum) {
    try {
      connectButton.disabled = true;
      connectButton.innerHTML =
        '<span class="button-icon">⏳</span> Connecting...';

      await window.ethereum.request({ method: "eth_requestAccounts" });
      web3 = new Web3(window.ethereum);
      contract = new web3.eth.Contract(abi, contractAddress);

      walletStatus.classList.add("connected");
      walletStatusText.textContent = "Connected";
      connectButton.innerHTML = '<span class="button-icon">✅</span> Connected';

      // Load election data
      await loadElectionData();

      // Set up event listeners
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          // Wallet disconnected
          walletStatus.classList.remove("connected");
          walletStatusText.textContent = "Not Connected";
          connectButton.disabled = false;
          connectButton.innerHTML =
            '<span class="button-icon">🔗</span> Connect Wallet';
          resultsContainer.innerHTML =
            '<div class="loading-message"><div class="spinner"></div><p>Please connect your wallet to view results</p></div>';
        } else {
          // Account changed
          loadElectionData();
        }
      });

      createConfetti();
    } catch (error) {
      console.error("Error connecting wallet:", error);
      connectButton.disabled = false;
      connectButton.innerHTML =
        '<span class="button-icon">🔗</span> Connect Wallet';
      showError("Failed to connect wallet");
    }
  } else {
    showError("MetaMask not detected. Please install MetaMask.");
  }
}

// Updated loadElectionData function
async function loadElectionData() {
  try {
    resultsContainer.innerHTML =
      '<div class="loading-message"><div class="spinner"></div><p>Loading election data...</p></div>';

    // Check voting status
    const isVotingOpen = await contract.methods.isVotingOpen().call();
    updateVotingStatus(isVotingOpen);

    // Get all positions
    const positions = await contract.methods.getElectionPositions().call();
    totalPositionsEl.textContent = positions.length;

    // Get all candidates and votes
    let totalVotes = 0;
    let candidateCount = 0;

    resultsContainer.innerHTML = "";

    for (const position of positions) {
      const candidates = await contract.methods
        .getCandidatesByPosition(position)
        .call();
      candidateCount += candidates.length;

      // Calculate total votes for this position
      const positionVotes = candidates.reduce(
        (sum, candidate) => sum + parseInt(candidate.voteCount),
        0
      );
      totalVotes += positionVotes;

      // Get winner - handle the tuple response properly
      const winnerInfo = await contract.methods
        .getWinnerByPosition(position)
        .call();
      const winnerName = winnerInfo[0];
      const winnerVotes = winnerInfo[1];

      // Create position card
      const positionCard = document.createElement("div");
      positionCard.className = "position-card fade-in";

      positionCard.innerHTML = `
                <div class="position-header">
                    <h2 class="position-title">${position}</h2>
                    <div class="position-winner">
                        <span class="winner-icon">👑</span>
                        <div>
                            <div class="winner-name">${winnerName}</div>
                            <div class="winner-votes">${winnerVotes} votes</div>
                        </div>
                    </div>
                </div>
                <div class="candidates-grid" id="candidates-${position.replace(
                  /\s+/g,
                  "-"
                )}"></div>
                <div class="chart-container">
                    <canvas id="chart-${position.replace(
                      /\s+/g,
                      "-"
                    )}"></canvas>
                </div>
            `;

      resultsContainer.appendChild(positionCard);

      // Add candidates
      const candidatesGrid = document.getElementById(
        `candidates-${position.replace(/\s+/g, "-")}`
      );

      candidates.forEach((candidate) => {
        const percentage =
          positionVotes > 0
            ? Math.round((candidate.voteCount / positionVotes) * 100)
            : 0;

        const candidateCard = document.createElement("div");
        candidateCard.className = "candidate-card fade-in";

        candidateCard.innerHTML = `
                    <div class="candidate-header">
                        <img src="${
                          candidate.imageUrl ||
                          "https://via.placeholder.com/150"
                        }" alt="${candidate.name}" class="candidate-image">
                        <div>
                            <div class="candidate-name">${candidate.name}</div>
                            <div class="candidate-position">${
                              candidate.position
                            }</div>
                        </div>
                    </div>
                    <div class="candidate-description">${
                      candidate.description || "No description provided"
                    }</div>
                    <div class="candidate-votes">
                        <div class="vote-count">${
                          candidate.voteCount
                        } votes</div>
                        <div class="vote-percentage">${percentage}%</div>
                    </div>
                `;

        candidatesGrid.appendChild(candidateCard);
      });

      // Create chart
      createChart(
        `chart-${position.replace(/\s+/g, "-")}`,
        position,
        candidates.map((c) => c.name),
        candidates.map((c) => c.voteCount)
      );
    }

    totalVotesEl.textContent = totalVotes;
    totalCandidatesEl.textContent = candidateCount;
  } catch (error) {
    console.error("Error loading election data:", error);
    showError("Failed to load election data. Please try again later.");
  }
}

// Create Chart
function createChart(canvasId, position, labels, data) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  const colors = [
    "#1A5276",
    "#E67E22",
    "#27AE60",
    "#F1C40F",
    "#3498DB",
    "#E74C3C",
    "#9B59B6",
    "#2ECC71",
    "#16A085",
    "#D35400",
    "#2C3E50",
    "#8E44AD",
  ];

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: `Votes for ${position}`,
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.raw} votes`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
      animation: {
        duration: 1500,
        easing: "easeOutQuart",
      },
    },
  });
}

// Update Voting Status
function updateVotingStatus(isOpen) {
  if (isOpen) {
    votingStatus.classList.add("open");
    votingStatusText.textContent = "Voting: Open";
  } else {
    votingStatus.classList.remove("open");
    votingStatusText.textContent = "Voting: Closed";
  }
}

// Show Error
function showError(message) {
  resultsContainer.innerHTML = `<div class="error-message">${message}</div>`;
}

// Create Confetti Effect
function createConfetti() {
  confettiContainer.innerHTML = "";
  const colors = [
    "#1A5276",
    "#E67E22",
    "#27AE60",
    "#F1C40F",
    "#3498DB",
    "#E74C3C",
  ];

  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.width = `${Math.random() * 8 + 4}px`;
    confetti.style.height = confetti.style.width;
    confetti.style.animation = `confetti-fall ${
      Math.random() * 3 + 2
    }s linear forwards`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confettiContainer.appendChild(confetti);
  }

  setTimeout(() => {
    confettiContainer.innerHTML = "";
  }, 3000);
}

// Event Listeners
connectButton.addEventListener("click", connectWallet);

// Initialize
window.addEventListener("load", async () => {
  await loadABI();

  // Check if already connected
  if (window.ethereum && window.ethereum.selectedAddress) {
    connectWallet();
  }
});
