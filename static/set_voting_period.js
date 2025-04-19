let web3;
let contract;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D";

// Connect Wallet
async function connectWallet() {
  if (window.ethereum) {
    try {
      const connectBtn = document.getElementById("connectWalletBtn");
      connectBtn.innerHTML =
        '<i class="fas fa-circle-notch fa-spin loading"></i> Connecting...';

      web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const shortAddress = `${accounts[0].substring(
        0,
        6
      )}...${accounts[0].substring(38)}`;
      document.getElementById(
        "walletInfo"
      ).innerHTML = `<i class="fas fa-check-circle"></i> ${shortAddress}`;
      document.getElementById("connectWalletBtn").style.display = "none";
      document.getElementById("submitBtn").disabled = false;

      // Load contract ABI
      const response = await fetch("/static/contract_abi.json");
      const abi = await response.json();
      contract = new web3.eth.Contract(abi, contractAddress);

      updateStatus("✅ Wallet connected!", "success");
    } catch (error) {
      updateStatus("❌ Connection failed", "error");
      console.error(error);
    }
  } else {
    updateStatus("❌ Please install MetaMask", "error");
  }
}

// Update status message
function updateStatus(message, type) {
  const statusElement = document.getElementById("formStatus");
  statusElement.textContent = message;
  statusElement.className = type;
}

// Convert to UNIX timestamp
function getTimestamp(dateStr, timeStr) {
  const [year, month, day] = dateStr.split("-");
  const [hour, minute] = timeStr.split(":");
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

// Form submission
document
  .getElementById("votingPeriodForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const startDate = document.getElementById("startDate").value;
    const startTime = document.getElementById("startTime").value;
    const endDate = document.getElementById("endDate").value;
    const endTime = document.getElementById("endTime").value;

    if (!startDate || !startTime || !endDate || !endTime) {
      updateStatus("❌ Please fill all fields", "error");
      return;
    }

    try {
      const submitBtn = document.getElementById("submitBtn");
      submitBtn.innerHTML =
        '<i class="fas fa-circle-notch fa-spin loading"></i> Processing...';
      submitBtn.disabled = true;

      const startTimestamp = getTimestamp(startDate, startTime);
      const endTimestamp = getTimestamp(endDate, endTime);

      if (startTimestamp >= endTimestamp) {
        updateStatus("❌ Start time must be before end time", "error");
        submitBtn.innerHTML =
          '<i class="fas fa-calendar-check"></i> Set Voting Period';
        submitBtn.disabled = false;
        return;
      }

      const accounts = await web3.eth.getAccounts();
      await contract.methods
        .setVotingPeriod(startTimestamp, endTimestamp)
        .send({ from: accounts[0] });

      updateStatus("✅ Voting period set successfully!", "success");
    } catch (err) {
      console.error(err);
      updateStatus(`❌ Error: ${err.message.split("(")[0]}`, "error");
    } finally {
      const submitBtn = document.getElementById("submitBtn");
      submitBtn.innerHTML =
        '<i class="fas fa-calendar-check"></i> Set Voting Period';
      submitBtn.disabled = false;
    }
  });
