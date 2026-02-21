# Smart Contracts Integration Guide

This document describes the **smart contracts** in `smart contracts/` and how they integrate with the **FastAPI MRV backend** and **Supabase**.

---

## Smart Contracts Overview

| Contract | Purpose |
|----------|---------|
| **CarbonRegistry** | Registry for carbon projects; stores data hashes; anti-double counting; verifier approval. |
| **CarbonCreditToken** | ERC-1155 token (1 token = 1 ton CO₂); minting with multi-sig; retire credits. |
| **OracleConsumer** | Oracle for NDVI verification and carbon calculation approval; request/response flow. |
| **MultiSigWallet** | 3-party approval (verifier, admin, oracle); transaction queuing; emergency pause. |
| **MerkleTreeUtils** | Merkle root registration; proof verification; batch operations. |

---

## Flow: Backend → Blockchain

```
MRV Backend (FastAPI)
    ↓
1. ML pipeline verifies submission (mangrove, temporal, biomass, carbon)
    ↓
2. blockchain_service.anchor_submission(submission_id)
    ↓
3. Compute SHA-256 hash of submission data
    ↓
4. Call CarbonRegistry.registerProject(projectID, dataHash, merkleRoot, metadataURI)
    ↓
5. (Optional) Call CarbonRegistry.verifyProject(projectID)
    ↓
6. (Optional) OracleConsumer: request NDVI / carbon approval → mint CarbonCreditToken
```

---

## Backend Integration

### 1. Where the backend triggers blockchain

- **File:** `server/app/services/ml_pipeline.py`  
- **When:** After a submission is marked `verified` (mangrove, temporal, biomass, carbon done).  
- **What:** Calls `blockchain_service.anchor_submission(submission_id)`.

### 2. What the blockchain service does today

- **File:** `server/app/services/blockchain_service.py`  
- Builds a **data hash** (SHA-256) of submission + project + carbon/biomass/model version.  
- If `BLOCKCHAIN_ENABLED` and credentials are set: intended to send that hash on-chain (currently a placeholder).  
- If not: returns a mock result with the same hash for testing.

### 3. Contract calls the backend should perform

| Step | Contract | Function | Backend role |
|------|----------|----------|--------------|
| Anchor hash | **CarbonRegistry** | `registerProject(projectID, dataHash, merkleRoot, metadataURI)` | Call after verification. |
| Mark verified | **CarbonRegistry** | `verifyProject(projectID)` | Call when verifier approves (could be same flow as above). |
| Request oracle | **OracleConsumer** | `requestNDVIVerification(projectID, dataHash)` | Optional: when you want on-chain NDVI/carbon approval. |
| Fulfill oracle | **OracleConsumer** | Fulfill request with NDVI + carbon result | Backend (as “oracle”) signs and submits. |
| Mint credits | **CarbonCreditToken** | `mintCarbon(projectID, amount, vSig, oSig, aSig)` | After oracle approval; needs multi-sig. |

The backend’s **blockchain_service** is the place to implement these calls (see below).

---

## Deployment (Smart Contracts)

### Prerequisites

- Node.js 18+
- npm or yarn

### One-time setup

```bash
# From repo root
cd "smart contracts"

# If you have a Hardhat project, install deps (adjust path if your project is elsewhere)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-ethers ethers@6 @openzeppelin/contracts dotenv
```

### Deploy locally

```bash
# Terminal 1: local chain
npx hardhat node

# Terminal 2: deploy
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost
```

### Deploy to testnet (e.g. Sepolia)

1. Copy `hardhat.config.ts.txt` → `hardhat.config.ts`, and `deploy.ts.txt` → `scripts/deploy.ts` into your Hardhat project.
2. Create `.env`:
   - `SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY`
   - `PRIVATE_KEY=your_private_key`
3. Run:
   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```
4. Save the printed contract addresses for the backend (see below).

---

## Backend configuration for contracts

In the FastAPI app, the blockchain service reads from config (e.g. `.env`):

| Variable | Description |
|----------|-------------|
| `BLOCKCHAIN_ENABLED` | Set to `true` to call real contracts. |
| `BLOCKCHAIN_RPC_URL` | RPC URL (e.g. `http://127.0.0.1:8545` or Sepolia/Mainnet). |
| `CARBON_REGISTRY_ADDRESS` | Deployed **CarbonRegistry** address. |
| `ORACLE_CONSUMER_ADDRESS` | Deployed **OracleConsumer** address (optional). |
| `CARBON_CREDIT_TOKEN_ADDRESS` | Deployed **CarbonCreditToken** address (optional). |
| `PRIVATE_KEY` | Wallet private key (for backend/oracle signer). |

After deployment, put the addresses from the deploy script into these variables so the backend can call the right contracts.

---

## Implementing real contract calls in the backend

To move from “mock” to real blockchain:

1. **Install Web3 in the backend**
   - Add to `server/requirements.txt`: `web3>=6.0.0`
   - In `blockchain_service.py`, use `web3` to connect to `BLOCKCHAIN_RPC_URL` and load the contract ABIs.

2. **CarbonRegistry**
   - Build `dataHash` (bytes32) from the same payload you already hash (e.g. SHA-256 of submission JSON).
   - Call `registerProject(projectID, dataHash, merkleRoot, metadataURI)`.
   - Optionally call `verifyProject(projectID)` with the verifier wallet.

3. **OracleConsumer (optional)**
   - When you want on-chain NDVI/carbon approval: call `requestNDVIVerification(projectID, dataHash)`.
   - Implement an “oracle” path that submits the ML result and calls the fulfill function with the backend’s wallet.

4. **CarbonCreditToken (optional)**
   - After oracle approval, prepare and submit `mintCarbon(...)` with the required multi-sig (verifier, oracle, admin).

The existing `blockchain_service.anchor_submission()` is the right place to add steps 2–4 so that the MRV pipeline stays a single orchestration point.

---

## File layout (smart contracts)

```
smart contracts/
├── CarbonRegistry.sol      # Project registry + data hash anchoring
├── CarbonCreditToken.sol   # ERC-1155 carbon credits
├── OracleConsumer.sol      # NDVI / carbon oracle
├── MultiSigWallet.sol      # Multi-sig operations
├── MerkleTreeUtils.sol     # Merkle proofs
├── deploy.ts.txt           # Deploy script (copy to scripts/deploy.ts)
├── hardhat.config.ts.txt   # Hardhat config (copy to hardhat.config.ts)
├── INSTALLATION-GUIDE.md   # Setup and usage
└── FILES-TO-COPY.md        # Copy list for your Hardhat project
```

---

## Summary

- **Smart contracts** provide: project registry (CarbonRegistry), carbon tokens (CarbonCreditToken), oracle (OracleConsumer), multi-sig (MultiSigWallet), and Merkle utilities (MerkleTreeUtils).
- **Backend** triggers blockchain in `blockchain_service.anchor_submission()` after the MRV pipeline marks a submission as verified.
- **Integration** = deploy contracts → put addresses and RPC in backend config → implement Web3 calls in `blockchain_service.py` (register project, optionally verify, oracle, mint).

For step-by-step contract deployment and Hardhat setup, use **smart contracts/INSTALLATION-GUIDE.md**.
