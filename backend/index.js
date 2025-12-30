// index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// -------------------------------------------
// CONNECT TO ARC TESTNET
// -------------------------------------------
const provider = new ethers.JsonRpcProvider(
  process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network"
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log("Backend wallet address:", wallet.address);

// -------------------------------------------
// ARC USDC (Native Gas Token)
// -------------------------------------------
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const USDC_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address) view returns (uint256)"
];

const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

// -------------------------------------------
// IN-MEMORY LEADERBOARD
// -------------------------------------------
const leaderboard = {}; // { wallet: totalUSDC }

// -------------------------------------------
// HEALTH CHECK
// -------------------------------------------
app.get("/", (req, res) => res.send("Backend Live ✔️"));

// -------------------------------------------
// WALLET BALANCE
// -------------------------------------------
app.get("/balance", async (req, res) => {
  try {
    const nativeBal = await provider.getBalance(wallet.address);
    const usdcBal = await usdcContract.balanceOf(wallet.address);

    res.json({
      success: true,
      address: wallet.address,
      native: ethers.formatEther(nativeBal),
      usdc: ethers.formatUnits(usdcBal, 6)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------
// QUIZ QUESTIONS (19 TOTAL)
// -------------------------------------------
app.get("/quiz", (req, res) => {
  res.json([
    {
      question: "Which major stablecoin issuer is the primary developer of the Arc Layer-1 blockchain?",
      options: ["Tether (USDT)", "Circle (USDC)", "Paxos (USDP)", "MakerDAO (DAI)"],
      answer: "Circle (USDC)"
    },
    {
      question: "Arc is purpose-built primarily for which sector?",
      options: ["Gaming", "Stablecoin finance", "NFT art", "Social media"],
      answer: "Stablecoin finance"
    },
    {
      question: "Which token is used as native gas on Arc?",
      options: ["ARC", "ETH", "USDC", "MATIC"],
      answer: "USDC"
    },
    {
      question: "What type of transaction finality does Arc aim for?",
      options: ["Probabilistic", "Delayed", "Deterministic and near-instant", "Weekly"],
      answer: "Deterministic and near-instant"
    },
    {
      question: "Arc gas fees are designed to be:",
      options: ["Volatile", "Dollar-denominated", "Auction-based", "Random"],
      answer: "Dollar-denominated"
    },
    {
      question: "Arc supports which smart contract environment?",
      options: ["SVM", "Move VM", "EVM", "CVM"],
      answer: "EVM"
    },
    {
      question: "Which protocol allows Arc to move USDC cross-chain?",
      options: ["LayerZero", "CCTP", "Hop", "Across"],
      answer: "CCTP"
    },
    {
      question: "Arc is especially attractive to which group?",
      options: ["Meme traders", "Institutions", "NFT flippers", "Gamers"],
      answer: "Institutions"
    },
    {
      question: "What feature helps Arc support compliance use cases?",
      options: ["Opt-in privacy", "PoW mining", "Anonymous validators", "Random fees"],
      answer: "Opt-in privacy"
    },
    {
      question: "Arc reduces which DeFi pain point?",
      options: ["Slow wallets", "High gas unpredictability", "Low TPS", "No NFTs"],
      answer: "High gas unpredictability"
    },
    {
      question: "Which stablecoin is natively integrated into Arc?",
      options: ["DAI", "USDT", "USDC", "FRAX"],
      answer: "USDC"
    },
    {
      question: "Why is USDC gas beneficial?",
      options: ["Higher TPS", "Less volatility", "More NFTs", "Higher rewards"],
      answer: "Less volatility"
    },
    {
      question: "Arc aims to evolve into what type of network?",
      options: ["Centralized", "Private", "Community-driven", "Single-validator"],
      answer: "Community-driven"
    },
    {
      question: "Which user experience benefit does Arc emphasize?",
      options: ["Predictable costs", "Anonymous trading", "NFT royalties", "Meme coins"],
      answer: "Predictable costs"
    },
    {
      question: "Arc is optimized for which transaction type?",
      options: ["Stablecoin payments", "NFT mints", "Gaming loot", "Meme trading"],
      answer: "Stablecoin payments"
    },
    {
      question: "Which type of DeFi is Arc best suited for?",
      options: ["Institutional DeFi", "Degenerate DeFi", "Meme DeFi", "NFT DeFi"],
      answer: "Institutional DeFi"
    },
    {
      question: "Arc reduces user friction by removing the need to hold:",
      options: ["ETH", "BTC", "Volatile gas tokens", "NFTs"],
      answer: "Volatile gas tokens"
    },
    {
      question: "Arc supports which kind of fee predictability?",
      options: ["Dollar-pegged", "Market-based", "Auction-based", "Randomized"],
      answer: "Dollar-pegged"
    },
    {
      question: "Arc is designed for which long-term vision?",
      options: ["Short-term hype", "Enterprise-only", "Global adoption", "Closed systems"],
      answer: "Global adoption"
    }
  ]);
});

// -------------------------------------------
// SEND REWARD (0.2 USDC)
// -------------------------------------------
app.post("/reward", async (req, res) => {
  const { userAddress, questionIndex } = req.body;
  const REWARD_AMOUNT = "0.2";

  try {
    const rewardRaw = ethers.parseUnits(REWARD_AMOUNT, 6);
    const tx = await usdcContract.transfer(userAddress, rewardRaw);
    await tx.wait();

    leaderboard[userAddress] = (
      parseFloat(leaderboard[userAddress] || 0) + 0.2
    ).toFixed(2);

    res.json({
      success: true,
      rewardAmount: REWARD_AMOUNT,
      txHash: tx.hash
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------
// LEADERBOARD
// -------------------------------------------
app.get("/leaderboard", (req, res) => {
  const sorted = Object.entries(leaderboard)
    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
    .map(([address, reward]) => ({ address, reward }));

  res.json({
    success: true,
    participants: sorted.length,
    leaderboard: sorted
  });
});

// -------------------------------------------
// START SERVER
// -------------------------------------------
app.listen(PORT, () =>
  console.log(`Backend running → http://localhost:${PORT}`)
);
