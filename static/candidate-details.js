const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
let web3;
let contract;
let currentAccount;
let isAdmin = false;
let votingOpen = false;

// DOM Elements
const walletAddress = document.getElementById("walletAddress");
const adminBadge = document.getElementById("adminBadge");
const votingStatus = document.getElementById("votingStatus");
const candidateList = document.getElementById("candidateList");
const transactionModal = document.getElementById("transactionModal");
const transactionStatus = document.getElementById("transactionStatus");

// Initialize
window.addEventListener("load", async () => {
  await connectWallet();
  await loadCandidates();

  // Listen for account changes
  if (window.ethereum) {
    window.ethereum.on("accountsChanged", async (accounts) => {
      if (accounts.length > 0) {
        currentAccount = accounts[0];
        await updateWalletStatus();
        await loadCandidates();
      } else {
        // Wallet disconnected
        currentAccount = null;
        walletAddress.textContent = "Not connected";
        candidateList.innerHTML = `
          <div class="loading-candidates">
            <p>Please connect your wallet to view candidates</p>
          </div>
        `;
      }
    });
  }
});

// Connect Wallet
async function connectWallet() {
  if (typeof window.ethereum !== "undefined") {
    try {
      web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      currentAccount = accounts[0];
      await updateWalletStatus();
    } catch (error) {
      console.error("Wallet connection error:", error);
      walletAddress.textContent = "Connection failed";
    }
  } else {
    walletAddress.textContent = "MetaMask not found";
    candidateList.innerHTML = `
      <div class="loading-candidates">
        <p>Please install MetaMask to view candidates</p>
      </div>
    `;
  }
}

// Update wallet status
async function updateWalletStatus() {
  walletAddress.textContent = `${currentAccount.slice(
    0,
    6
  )}...${currentAccount.slice(-4)}`;

  try {
    const abiResponse = await fetch("/static/contract_abi.json");
    const abi = await abiResponse.json();
    contract = new web3.eth.Contract(abi, contractAddress);

    // Check admin status
    isAdmin = await contract.methods.isAdmin().call({ from: currentAccount });
    adminBadge.classList.toggle("hidden", !isAdmin);

    // Check voting status
    votingOpen = await contract.methods.isVotingOpen().call();
    votingStatus.innerHTML = votingOpen
      ? '<i class="fas fa-vote-yea"></i> Voting is OPEN'
      : '<i class="fas fa-lock"></i> Voting is CLOSED';
  } catch (error) {
    console.error("Status update error:", error);
  }
}

// Load candidates
async function loadCandidates() {
  candidateList.innerHTML = `
    <div class="loading-candidates">
      <div class="blockchain-loader">
        <div class="block"></div>
        <div class="block"></div>
        <div class="block"></div>
      </div>
      <p>Loading candidates from blockchain...</p>
    </div>
  `;

  try {
    const positions = await contract.methods.getElectionPositions().call();
    let candidatesHTML = "";

    for (const position of positions) {
      const candidates = await contract.methods
        .getCandidatesByPosition(position)
        .call();

      candidates.forEach((candidate) => {
        candidatesHTML += `
          <div class="candidate-card">
            <div class="candidate-info">
              <img src="${candidate.imageUrl}" alt="${
          candidate.name
        }" onerror="this.src='https://via.placeholder.com/300x200?text=Candidate+Image'">
              <h2>${candidate.name}</h2>
              <h4>Position: ${candidate.position}</h4>
              <p>${candidate.description}</p>
              <p><strong>Votes:</strong> ${candidate.voteCount}</p>
            </div>
            ${
              isAdmin && !votingOpen
                ? `
              <button class="delete-btn" onclick="deleteCandidate('${candidate.id}')">
                <i class="fas fa-trash"></i> Delete
              </button>
            `
                : ""
            }
          </div>
        `;
      });
    }

    candidateList.innerHTML =
      candidatesHTML ||
      `
      <div class="loading-candidates">
        <p>No candidates found for this election</p>
      </div>
    `;
  } catch (error) {
    console.error("Error loading candidates:", error);
    candidateList.innerHTML = `
      <div class="loading-candidates">
        <p>Failed to load candidates. Please try again.</p>
      </div>
    `;
  }
}

// Delete candidate
async function deleteCandidate(candidateId) {
  if (!confirm("Are you sure you want to delete this candidate?")) return;

  try {
    // Show transaction modal
    transactionModal.classList.add("active");
    transactionStatus.textContent = "Deleting candidate...";

    await contract.methods
      .deleteCandidate(candidateId)
      .send({ from: currentAccount })
      .on("transactionHash", (hash) => {
        transactionStatus.textContent = `Transaction sent: ${hash.slice(
          0,
          10
        )}...`;
      });

    // Refresh candidate list
    await loadCandidates();
  } catch (error) {
    console.error("Delete failed:", error);
    alert("Failed to delete candidate. You may not have permission.");
  } finally {
    transactionModal.classList.remove("active");
  }
}
