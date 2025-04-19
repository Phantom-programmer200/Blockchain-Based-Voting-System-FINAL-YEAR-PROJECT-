let web3;
let contract;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";
const pinataApiKey = "dd4abd6e5673e4759b1c";
const pinataSecretApiKey =
  "c392cf94cd5a7733e5e98f1ac42f78d1d9b94aad8def9ad78abe4f734d5c4c17";

// DOM Elements
const connectBtn = document.getElementById("connectWalletBtn");
const form = document.getElementById("candidateForm");
const submitBtn = document.getElementById("submitBtn");
const formStatus = document.getElementById("formStatus");
const walletAddress = document.getElementById("walletAddress");
const uploadArea = document.getElementById("uploadArea");
const uploadContent = document.getElementById("uploadContent");
const imagePreview = document.getElementById("imagePreview");
const candidateImage = document.getElementById("candidateImage");
const transactionModal = document.getElementById("transactionModal");
const transactionStatus = document.getElementById("transactionStatus");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Drag and drop for image upload
  uploadArea.addEventListener("click", () => candidateImage.click());
  candidateImage.addEventListener("change", handleFileSelect);

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "var(--accent-blue)";
    uploadArea.style.background = "rgba(0, 209, 255, 0.1)";
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.style.borderColor = "rgba(255, 255, 255, 0.1)";
    uploadArea.style.background = "rgba(0, 0, 0, 0.1)";
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = "rgba(255, 255, 255, 0.1)";
    uploadArea.style.background = "rgba(0, 0, 0, 0.1)";

    if (e.dataTransfer.files.length) {
      candidateImage.files = e.dataTransfer.files;
      handleFileSelect();
    }
  });

  // Form submission
  form.addEventListener("submit", handleFormSubmit);

  // Wallet connection
  connectBtn.addEventListener("click", connectWallet);
});

// Handle file selection with improved preview
function handleFileSelect() {
  const file = candidateImage.files[0];

  // Reset preview state
  uploadArea.classList.remove("has-image");
  imagePreview.innerHTML = "";

  if (file) {
    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      formStatus.textContent = "❌ Image size must be less than 5MB";
      formStatus.className = "error";
      return;
    }

    if (!file.type.match("image.*")) {
      formStatus.textContent = "❌ Please upload an image file";
      formStatus.className = "error";
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Candidate Preview">`;
      uploadArea.classList.add("has-image");
      formStatus.textContent = "✔️ Image ready for upload";
      formStatus.className = "success";
    };
    reader.readAsDataURL(file);
  }
}

// Connect Wallet
async function connectWallet() {
  if (window.ethereum) {
    try {
      connectBtn.innerHTML =
        '<i class="fas fa-circle-notch fa-spin"></i> Connecting...';

      web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const account = accounts[0];
      walletAddress.innerHTML = `
        <i class="fas fa-wallet" style="color: var(--accent-green)"></i>
        <span>${account.slice(0, 6)}...${account.slice(-4)}</span>
      `;

      const response = await fetch("/static/contract_abi.json");
      const abi = await response.json();
      contract = new web3.eth.Contract(abi, contractAddress);

      formStatus.textContent = "✅ Wallet connected!";
      formStatus.className = "success";
      connectBtn.style.display = "none";
    } catch (err) {
      console.error(err);
      formStatus.textContent = "❌ Wallet connection failed";
      formStatus.className = "error";
      connectBtn.innerHTML = '<i class="fas fa-plug"></i> Connect Wallet';
    }
  } else {
    formStatus.textContent = "❌ Please install MetaMask";
    formStatus.className = "error";
  }
}

// Upload image to Pinata
async function uploadImageToPinata(file) {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretApiKey,
      },
      body: formData,
    });

    const data = await res.json();
    if (data && data.IpfsHash) {
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } else {
      throw new Error("Failed to upload image");
    }
  } catch (err) {
    console.error("Pinata upload error:", err);
    throw err;
  }
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("candidateName").value.trim();
  const position = document.getElementById("candidatePosition").value.trim();
  const description = document
    .getElementById("candidateDescription")
    .value.trim();
  const imageFile = candidateImage.files[0];

  if (!web3 || !contract) {
    formStatus.textContent = "❌ Please connect your wallet first";
    formStatus.className = "error";
    return;
  }

  if (!name || !position || !description || !imageFile) {
    formStatus.textContent = "❌ All fields are required";
    formStatus.className = "error";
    return;
  }

  try {
    // Show transaction modal
    transactionModal.classList.add("active");
    transactionStatus.textContent = "Uploading image to IPFS...";

    // Upload image
    const imageUrl = await uploadImageToPinata(imageFile);
    transactionStatus.textContent =
      "Image uploaded! Processing blockchain transaction...";

    // Get accounts
    const accounts = await web3.eth.getAccounts();

    // Send transaction
    await contract.methods
      .addCandidate(name, position, description, imageUrl)
      .send({ from: accounts[0] })
      .on("transactionHash", (hash) => {
        transactionStatus.textContent = `Transaction sent: ${hash.slice(
          0,
          10
        )}...`;
      });

    // Success
    formStatus.textContent = "✅ Candidate added successfully!";
    formStatus.className = "success";
    form.reset();

    // Reset image preview
    uploadArea.classList.remove("has-image");
    imagePreview.innerHTML = "";
  } catch (err) {
    console.error(err);
    formStatus.textContent = `❌ Error: ${err.message.split("(")[0]}`;
    formStatus.className = "error";
  } finally {
    transactionModal.classList.remove("active");
  }
}
