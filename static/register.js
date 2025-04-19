let userAccount = null;
let contract = null;

// ✅ Initialize Pinata IPFS Client
const pinataApiKey = "dd4abd6e5673e4759b1c"; // Replace with your Pinata API Key
const pinataSecretApiKey =
  "c392cf94cd5a7733e5e98f1ac42f78d1d9b94aad8def9ad78abe4f734d5c4c17"; // Replace with your Pinata Secret API Key

const ipfs = window.IpfsHttpClient.create({
  url: "https://ipfs.pinata.cloud",
  headers: {
    pinata_api_key: pinataApiKey,
    pinata_secret_api_key: pinataSecretApiKey,
  },
});

// ✅ Detect Wallet Connection on Page Load
window.addEventListener("load", async () => {
  if (typeof window.ethereum !== "undefined") {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      userAccount = accounts[0];
      updateWalletStatus(userAccount);
    }
    initContract(); // load contract even if user hasn’t connected yet
  } else {
    alert("⚠️ MetaMask not found. Please install it to continue.");
  }
});

// ✅ Listen for account/network changes
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

// ✅ Update Wallet Status UI
function updateWalletStatus(account) {
  document.getElementById("wallet-status").innerText = `Connected: ${account}`;
}

// ✅ Connect Wallet Manually (on button click)
async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("⚠️ Please install MetaMask to connect your wallet.");
    return;
  }

  const expectedChainId = "0xAA36A7"; // Sepolia Chain ID
  const currentChainId = await ethereum.request({ method: "eth_chainId" });

  // Ask to switch if not on Sepolia
  if (currentChainId !== expectedChainId) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedChainId }],
      });
    } catch (switchError) {
      alert("⚠️ Please switch to the Sepolia Testnet manually.");
      return;
    }
  }

  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    userAccount = accounts[0];
    updateWalletStatus(userAccount);
    console.log("✅ Wallet connected:", userAccount);
  } catch (error) {
    console.error("❌ Wallet Connection Error:", error);
    alert("❌ Failed to connect wallet.");
  }
}

// ✅ Load Smart Contract ABI
async function loadContractABI() {
  try {
    const response = await fetch("/static/contract_abi.json");
    return await response.json();
  } catch (error) {
    console.error("❌ Failed to load contract ABI:", error);
  }
}

// ✅ Initialize Smart Contract
async function initContract() {
  const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
  const abi = await loadContractABI();

  if (!abi) {
    console.error("❌ Contract ABI missing!");
    return;
  }

  const web3 = new Web3(window.ethereum);
  contract = new web3.eth.Contract(abi, contractAddress);
  console.log("✅ Smart contract initialized");
}

// ✅ Handle Voter Registration
document
  .getElementById("registration-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!userAccount) {
      alert("⚠️ Connect your wallet first.");
      return;
    }

    if (!contract) {
      alert("⚠️ Smart contract not ready. Please refresh.");
      return;
    }

    const name = document.getElementById("name").value;
    const file = document.getElementById("document-file").files[0];

    if (!name || !file) {
      alert("⚠️ Fill all required fields.");
      return;
    }

    try {
      console.log("📤 Uploading to IPFS using Pinata...");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretApiKey,
          },
          body: formData,
        }
      );

      const ipfsResponse = await response.json();
      if (!ipfsResponse || !ipfsResponse.IpfsHash) {
        throw new Error("IPFS upload failed.");
      }

      const documentIPFSHash = ipfsResponse.IpfsHash;
      document.getElementById("document-url").value = documentIPFSHash;

      console.log("🔗 Registering on blockchain...");
      await contract.methods
        .registerVoter(name, documentIPFSHash)
        .send({ from: userAccount });

      document.getElementById("registration-status").textContent =
        "✅ Registration successful!";
      console.log("✅ Registration successful");
    } catch (error) {
      console.error("❌ Registration Error:", error);

      let errorMsg = "❌ Registration failed.";
      if (error.message.includes("already registered")) {
        errorMsg = "⚠️ You are already registered!";
      } else if (error.message.includes("User denied transaction")) {
        errorMsg = "⚠️ Transaction was rejected.";
      }

      document.getElementById("registration-status").textContent = errorMsg;
    }
  });

// Add these functions to your existing register.js

// Document Preview Functionality
document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("document-file");
  const previewContainer = document.getElementById(
    "document-preview-container"
  );
  const previewElement = document.getElementById("document-preview");
  const placeholder = previewElement.querySelector(".preview-placeholder");
  const clearBtn = document.getElementById("clear-document");
  const viewBtn = document.getElementById("view-document");
  const modal = document.getElementById("document-modal");
  const modalContent = document.getElementById("modal-preview-content");
  const closeModal = document.querySelector(".close-modal");

  fileInput.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      previewContainer.style.display = "block";
      placeholder.style.display = "none";

      if (file.type === "application/pdf") {
        // For PDF files
        previewElement.innerHTML = `
                  <iframe src="${URL.createObjectURL(
                    file
                  )}#toolbar=0&navpanes=0" 
                          style="width:100%;height:100%;"></iframe>
              `;
        viewBtn.disabled = false;
      } else if (file.type.startsWith("image/")) {
        // For image files
        const reader = new FileReader();
        reader.onload = function (e) {
          previewElement.innerHTML = `
                      <img src="${e.target.result}" alt="Document Preview">
                  `;
        };
        reader.readAsDataURL(file);
        viewBtn.disabled = false;
      } else {
        // Unsupported file type
        previewElement.innerHTML = `
                  <div class="unsupported-file">
                      <i class="fas fa-exclamation-triangle"></i>
                      <p>Preview not available for this file type</p>
                  </div>
              `;
        viewBtn.disabled = true;
      }
    }
  });

  clearBtn.addEventListener("click", function () {
    fileInput.value = "";
    previewContainer.style.display = "none";
    previewElement.innerHTML = `
          <div class="preview-placeholder">
              <i class="fas fa-file-alt"></i>
              <p>Document preview will appear here</p>
          </div>
      `;
    viewBtn.disabled = true;
  });

  viewBtn.addEventListener("click", function () {
    if (!fileInput.files[0]) return;

    const file = fileInput.files[0];
    modal.style.display = "block";

    if (file.type === "application/pdf") {
      modalContent.innerHTML = `
              <iframe src="${URL.createObjectURL(file)}" 
                      style="width:100%;height:100%;"></iframe>
          `;
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        modalContent.innerHTML = `
                  <img src="${e.target.result}" alt="Document Preview">
              `;
      };
      reader.readAsDataURL(file);
    }
  });

  closeModal.addEventListener("click", function () {
    modal.style.display = "none";
    modalContent.innerHTML = "";
  });

  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
      modalContent.innerHTML = "";
    }
  });
});

// Rest of your existing JavaScript...
