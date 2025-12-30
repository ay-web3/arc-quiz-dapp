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
//  CONNECT TO ARC TESTNET
// -------------------------------------------
const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log("Backend wallet address:", wallet.address);

// -------------------------------------------
//  ARC USDC CONTRACT (6 decimals for ERC-20)
// -------------------------------------------
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const USDC_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address) view returns (uint256)"
];

const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

// -------------------------------------------
//  HEALTH CHECK
// -------------------------------------------
app.get("/", (req, res) => res.send("Backend Live ✔️"));

// -------------------------------------------
//  SERVER WALLET BALANCE ENDPOINT
// -------------------------------------------
app.get("/balance", async (req, res) => {
  try {
    const nativeBal = await provider.getBalance(wallet.address);
    const usdcBal = await usdcContract.balanceOf(wallet.address);

    res.json({
      success: true,
      address: wallet.address,
      native: ethers.formatEther(nativeBal),
      usdc: ethers.formatUnits(usdcBal, 6),
    });

  } catch (err) {
    console.error("Balance fetch error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------
//  QUIZ QUESTIONS
// -------------------------------------------
app.get("/quiz", (req, res) => {
  res.json([
    {
      question: "Which major stablecoin issuer is the primary developer of the Arc Layer-1 blockchain?",
      options: ["Tether (USDT)", "Circle (USDC)", "Paxos (USDP)", "MakerDAO (DAI)"],
      answer: "Circle (USDC)"
    },
    {
      question: "Arc is described as a blockchain that is purpose-built for which primary sector of the crypto economy?",
      options: ["Public NFT Mints", "Social Media dApps", "Stablecoin Finance and Institutional DeFi", "Gaming and Metaverse"],
      answer: "Stablecoin Finance and Institutional DeFi"
    },
    {
      question: "Which token is used for native gas on the Arc Network?",
      options: ["ARC", "ETH", "USDC", "MATIC"],
      answer: "USDC"
    },
    {
      question: "Arc's consensus engine, known as Malachite, is designed for which critical performance feature?",
      options: ["Low transaction volume", "High fees", "Deterministic, sub-second transaction finality", "Slow block confirmation"],
      answer: "Deterministic, sub-second transaction finality"
    },
    {
      question: "Arc aims to provide a high degree of predictability for users by pegging the gas fees to a stable, low dollar-denominated value.",
      options: ["True", "False"],
      answer: "True"
    },
    {
      question: "What does the Arc Network offer to institutions that is often lacking in public blockchains, which involves protecting sensitive information?",
      options: ["Mandatory KYC for all users", "Centralized data logging", "Opt-in configurable privacy features", "Permanent data encryption"],
      answer: "Opt-in configurable privacy features"
    },
    {
      question: "The Arc Network is compatible with tools and code written for which popular smart contract execution environment?",
      options: ["Solana Virtual Machine (SVM)", "Ethereum Virtual Machine (EVM)", "Cardano Virtual Machine (CVM)"],
      answer: "Ethereum Virtual Machine (EVM)"
    },
    {
      question: "Which of the following is NOT a use case specifically targeted by the Arc Network?",
      options: ["Payments and cross-border settlement", "Tokenized assets and securities", "Institutional lending and borrowing", "High-volume, public NFT mints"],
      answer: "High-volume, public NFT mints"
    },
    {
      question: "Arc integrates directly with Circle's cross-chain transfer protocol, which allows native movement of USDC between supported chains. What is this protocol called?",
      options: ["XferProtocol", "CCTP (Cross-Chain Transfer Protocol)", "USDC Bridge Standard", "Layer Zero"],
      answer: "CCTP (Cross-Chain Transfer Protocol)"
    },
    {
      question: "As of the public testnet phase, Circle's long-term vision is for the network to evolve into a system operated and governed by:",
      options: ["The Circle team exclusively", "A consortium of banks only", "A broad, globally distributed set of participants and a community-driven system."],
      answer: "A broad, globally distributed set of participants and a community-driven system."
    }
  ]);
});

// -------------------------------------------
//  SEND USDC REWARD (0.02 USDC PER CORRECT QUESTION)
// -------------------------------------------
app.post("/reward", async (req, res) => {
  const { userAddress, questionIndex } = req.body;
  const REWARD_AMOUNT = "0.05"; // Fixed reward per question

  if (!userAddress || questionIndex === undefined) {
    return res.status(400).json({
      success: false,
      message: "Missing userAddress or question index."
    });
  }

  try {
    const nativeBal = await provider.getBalance(wallet.address);
    if (nativeBal < ethers.parseEther("0.00005")) {
      return res.json({
        success: false,
        message: "Backend wallet low on native Arc USDC for gas fees."
      });
    }

    const contractBal = await usdcContract.balanceOf(wallet.address);
    const rewardAmountRaw = ethers.parseUnits(REWARD_AMOUNT, 6);

    if (contractBal < rewardAmountRaw) {
      return res.json({
        success: false,
        message: `Backend wallet does not have enough USDC to send ${REWARD_AMOUNT}.`
      });
    }

    const tx = await usdcContract.transfer(userAddress, rewardAmountRaw);
    const receipt = await tx.wait();
    
    console.log(`Reward for Question ${questionIndex} confirmed! Tx Hash: ${tx.hash}`);

    return res.json({
      success: true,
      message: "Reward sent and confirmed successfully!",
      txHash: tx.hash,
      rewardAmount: REWARD_AMOUNT 
    });

  } catch (err) {
    console.error(`Reward error for Q${questionIndex}:`, err);
    return res.status(500).json({
      success: false,
      message: `Transaction failed: ${err.message}`
    });
  }
});

// -------------------------------------------
//  START SERVER
// -------------------------------------------
app.listen(PORT, () =>
  console.log(`Backend running → http://localhost:${PORT}`)
);
