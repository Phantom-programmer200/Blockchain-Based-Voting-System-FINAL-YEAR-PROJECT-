// Contract variables
let contract;
let web3;
const contractAddress = "0xF5B8C24409bE242dB535Bac3cE597B11D17F7e0D"; // Replace this

// UI Elements
const resultsContainer = document.getElementById("resultsContainer");
const metamaskStatus = document.getElementById("metamaskStatus");
const refreshBtn = document.getElementById("refreshBtn");

// Unique Interactive Features
function createConfetti(x, y) {
  const colors = [
    "#1A5276",
    "#E67E22",
    "#27AE60",
    "#F1C40F",
    "#3498DB",
    "#E74C3C",
    "#9B59B6",
    "#2ECC71",
  ];
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = `${x}px`;
    confetti.style.top = `${y}px`;
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    confetti.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;

    document.body.appendChild(confetti);

    const angle = Math.random() * Math.PI * 2;
    const velocity = 5 + Math.random() * 5;
    const xVel = Math.cos(angle) * velocity;
    const yVel = Math.sin(angle) * velocity;

    let posX = x;
    let posY = y;
    let opacity = 1;

    const animate = () => {
      posX += xVel;
      posY += yVel + 0.5; // Add gravity
      opacity -= 0.02;

      confetti.style.left = `${posX}px`;
      confetti.style.top = `${posY}px`;
      confetti.style.opacity = opacity;

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        confetti.remove();
      }
    };

    requestAnimationFrame(animate);
  }
}

function animateWinnerCard(card) {
  card.style.animation = "none";
  void card.offsetWidth; // Trigger reflow
  card.style.animation = "pulse 2s infinite";

  // Add confetti to winner cards
  card.addEventListener("click", (e) => {
    createConfetti(e.clientX, e.clientY);
  });
}

async function checkMetaMaskConnection() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        metamaskStatus.classList.remove("disconnected");
        metamaskStatus.classList.add("connected");
        metamaskStatus.querySelector(
          "span"
        ).textContent = `Connected: ${accounts[0].slice(
          0,
          6
        )}...${accounts[0].slice(-4)}`;
      } else {
        metamaskStatus.classList.remove("connected");
        metamaskStatus.classList.add("disconnected");
        metamaskStatus.querySelector("span").textContent =
          "MetaMask Not Connected";
      }
    } catch (err) {
      console.error(err);
    }
  }
}

async function loadContract() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      const response = await fetch("/static/contract_abi.json");
      const contractABI = await response.json();
      contract = new web3.eth.Contract(contractABI, contractAddress);
      await checkMetaMaskConnection();
      await loadResults();

      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts) => {
        checkMetaMaskConnection();
        loadResults();
      });

      // Listen for chain changes
      window.ethereum.on("chainChanged", (chainId) => {
        window.location.reload();
      });
    } catch (err) {
      console.error("Failed to load contract ABI:", err);
    }
  } else {
    metamaskStatus.classList.add("disconnected");
    metamaskStatus.querySelector("span").textContent = "MetaMask Not Installed";
  }
}

async function loadResults() {
  try {
    // Show loading state
    resultsContainer.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--dark-gray)">Loading results...</div>';

    const count = await contract.methods.candidatesCount().call();
    const uniquePositions = new Set();

    // First collect all positions from candidates
    for (let i = 1; i <= count; i++) {
      const candidate = await contract.methods.getCandidate(i).call();
      uniquePositions.add(candidate[1]); // position
    }

    const positions = [...uniquePositions];
    resultsContainer.innerHTML = "";

    for (let position of positions) {
      const candidates = await contract.methods
        .getCandidatesByPosition(position)
        .call();

      const labels = candidates.map((c) => c.name);
      const data = candidates.map((c) => parseInt(c.voteCount));

      const chartCard = document.createElement("div");
      chartCard.classList.add("chart-card", "fade-in");

      const title = document.createElement("h3");
      title.classList.add("chart-title");
      title.textContent = `Results`;
      const positionTag = document.createElement("span");
      positionTag.classList.add("position-tag");
      positionTag.textContent = position;
      title.appendChild(positionTag);
      chartCard.appendChild(title);

      const winner = candidates.reduce(
        (max, c) => (c.voteCount > max.voteCount ? c : max),
        candidates[0]
      );

      const winnerDisplay = document.createElement("div");
      winnerDisplay.classList.add("winner-display");

      const trophyIcon = document.createElement("div");
      trophyIcon.classList.add("trophy");
      trophyIcon.innerHTML = "🏆";
      winnerDisplay.appendChild(trophyIcon);

      const winnerInfo = document.createElement("div");
      winnerInfo.classList.add("winner-info");

      const winnerName = document.createElement("div");
      winnerName.classList.add("winner-name");
      winnerName.textContent = winner.name;
      winnerInfo.appendChild(winnerName);

      const winnerVotes = document.createElement("div");
      winnerVotes.classList.add("winner-votes");
      winnerVotes.textContent = `Total Votes: ${winner.voteCount}`;
      winnerInfo.appendChild(winnerVotes);

      winnerDisplay.appendChild(winnerInfo);
      chartCard.appendChild(winnerDisplay);

      const canvasContainer = document.createElement("div");
      canvasContainer.classList.add("chart-container");
      const canvas = document.createElement("canvas");
      canvasContainer.appendChild(canvas);
      chartCard.appendChild(canvasContainer);

      resultsContainer.appendChild(chartCard);

      new Chart(canvas.getContext("2d"), {
        type: "pie",
        data: {
          labels: labels,
          datasets: [
            {
              label: `Votes for ${position}`,
              data: data,
              backgroundColor: generateColors(labels.length),
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1500,
            easing: "easeOutBounce",
          },
          plugins: {
            legend: {
              position: "bottom",
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.label || "";
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} votes (${percentage}%)`;
                },
              },
            },
          },
          onClick: (e) => {
            const points = e.chart.getElementsAtEventForMode(
              e,
              "nearest",
              { intersect: true },
              true
            );
            if (points.length) {
              const firstPoint = points[0];
              const label = e.chart.data.labels[firstPoint.index];
              const value =
                e.chart.data.datasets[firstPoint.datasetIndex].data[
                  firstPoint.index
                ];
              createConfetti(e.event.x, e.event.y);
            }
          },
        },
      });

      // Animate the winner card
      animateWinnerCard(winnerDisplay);
    }
  } catch (err) {
    console.error("Failed to load election results:", err);
    resultsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--error-red)">Error loading results. Please try again.</div>`;
  }
}

function generateColors(count) {
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
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

// Event Listeners
refreshBtn.addEventListener("click", () => {
  refreshBtn.classList.add("rotate");
  loadResults().finally(() => {
    setTimeout(() => {
      refreshBtn.classList.remove("rotate");
    }, 500);
  });
});

window.addEventListener("load", loadContract);
