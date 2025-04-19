let web3;
let contract;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";

// DOM Elements
const walletBtn = document.getElementById("walletBtn");
const walletStatus = document.querySelector(".wallet-status");
const statusMessage = document.getElementById("statusMessage");
const candidateContainer = document.getElementById("candidateContainer");
const searchInput = document.getElementById("searchInput");
const positionSelect = document.getElementById("positionSelect");
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

// Initialize the page
window.addEventListener("load", async () => {
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

      // Update wallet button
      const accounts = await web3.eth.getAccounts();
      updateWalletStatus(accounts[0]);

      // Load candidates
      loadCandidates();
    } catch (error) {
      console.error("Error initializing:", error);
      showError("Failed to initialize. Please refresh the page.");
    }
  } else {
    showError("Please install MetaMask to view candidates.");
    walletBtn.style.display = "none";
  }

  // Set up event listeners
  setupEventListeners();
});

// Update wallet connection status
function updateWalletStatus(account) {
  if (account) {
    const shortAddress = `${account.substring(0, 6)}...${account.substring(
      38
    )}`;
    walletStatus.textContent = shortAddress;
    walletBtn.classList.add("connected");
    walletBtn.title = account;
  } else {
    walletStatus.textContent = "Connect Wallet";
    walletBtn.classList.remove("connected");
  }
}

// Load candidates from contract
async function loadCandidates() {
  try {
    // Show loading state
    statusMessage.innerHTML =
      '<i class="fas fa-circle-notch fa-spin"></i> Loading candidates...';

    // Get candidates count
    const count = await contract.methods.candidatesCount().call();

    // Clear existing candidates (except skeletons)
    const skeletonCards = document.querySelectorAll(".candidate-card.skeleton");
    skeletonCards.forEach((card) => card.remove());

    if (count == 0) {
      showEmptyState();
      return;
    }

    // Load each candidate
    for (let i = 1; i <= count; i++) {
      try {
        const candidate = await contract.methods.getCandidate(i).call();

        // Create candidate card
        const card = document.createElement("div");
        card.className = "candidate-card";
        card.dataset.name = candidate[0].toLowerCase();
        card.dataset.position = candidate[1].toLowerCase();
        card.innerHTML = `
                    <img src="${
                      candidate[3] || "static/images/default-candidate.jpg"
                    }" alt="${
          candidate[0]
        }" onerror="this.src='static/images/default-candidate.jpg'">
                    <div class="candidate-info">
                        <h2>${candidate[0]}</h2>
                        <p><strong>Position:</strong> ${candidate[1]}</p>
                        <p>${candidate[2] || "No description provided"}</p>
                        <div class="vote-count">
                            <i class="fas fa-vote-yea"></i>
                            <span>${candidate[4]} votes</span>
                        </div>
                    </div>
                `;

        candidateContainer.appendChild(card);
      } catch (error) {
        console.error(`Error loading candidate ${i}:`, error);
      }
    }

    // Update status
    statusMessage.innerHTML =
      '<i class="fas fa-check-circle"></i> Candidates loaded successfully';
    statusMessage.classList.add("success");
  } catch (error) {
    console.error("Error loading candidates:", error);
    showError("Failed to load candidates. Please try again.");
  }
}

// Show empty state
function showEmptyState() {
  candidateContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-user-slash"></i>
            <h3>No Candidates Found</h3>
            <p>There are currently no candidates registered for the election.</p>
        </div>
    `;
  statusMessage.innerHTML =
    '<i class="fas fa-info-circle"></i> No candidates found';
  statusMessage.classList.remove("error", "success");
}

// Filter candidates based on search and position
function filterCandidates() {
  const searchTerm = searchInput.value.toLowerCase();
  const positionFilter = positionSelect.value.toLowerCase();
  const cards = document.querySelectorAll(".candidate-card:not(.skeleton)");

  let visibleCount = 0;

  cards.forEach((card) => {
    const name = card.dataset.name;
    const position = card.dataset.position;

    const matchesSearch =
      name.includes(searchTerm) || position.includes(searchTerm);
    const matchesPosition =
      positionFilter === "" || position === positionFilter;

    if (matchesSearch && matchesPosition) {
      card.style.display = "flex";
      visibleCount++;
    } else {
      card.style.display = "none";
    }
  });

  // Show empty state if no candidates match filters
  if (visibleCount === 0 && cards.length > 0) {
    candidateContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Matching Candidates</h3>
                <p>No candidates match your search criteria. Try adjusting your filters.</p>
            </div>
        `;
  }
}

// Show error message
function showError(message) {
  statusMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  statusMessage.classList.add("error");
}

// Set up event listeners
function setupEventListeners() {
  // Wallet button
  walletBtn.addEventListener("click", async () => {
    if (!web3) {
      await connectWallet();
    } else {
      // In a real app, you might want to disconnect or show account info
      alert(`Connected to: ${walletBtn.title}`);
    }
  });

  // Search input
  searchInput.addEventListener("input", filterCandidates);

  // Position filter
  positionSelect.addEventListener("change", filterCandidates);

  // Scroll to top button
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add("visible");
    } else {
      scrollToTopBtn.classList.remove("visible");
    }
  });

  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Handle account changes
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
      if (accounts.length === 0) {
        // Wallet disconnected
        updateWalletStatus(null);
      } else {
        // Account changed
        updateWalletStatus(accounts[0]);
      }
    });
  }
}

// Connect wallet function (if not already connected)
async function connectWallet() {
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.getAccounts();
    updateWalletStatus(accounts[0]);

    // Reload candidates with new wallet connection
    loadCandidates();
  } catch (error) {
    console.error("Error connecting wallet:", error);
    showError("Failed to connect wallet. Please try again.");
  }
}
