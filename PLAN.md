# Solution Plan — Blockchain HomeTask

## Status

Both required features are **fully implemented**. This document maps every
checklist item from `INSTRUCTIONS.md` to the exact file and function that
implements it.

> **Security note:** A full project audit found malicious obfuscated code inside
> `utils/fee.js` (39 KB of hidden JS that imported `child_process` and called
> `exec()` with a base64-decoded shell command) and a C2 URL encoded as a byte
> array in `config/index.js` (`testpvk`). Both have been removed and replaced
> with clean equivalents. Do not run this project without auditing your system
> if the original code was executed.

---

## Task 1 — Cryptographic Wallet System

### Backend

| INSTRUCTIONS.md item | File | Function / line |
|---|---|---|
| `POST /api/wallets` — generates `{ publicKey, privateKey }` | [routes/wallet.routes.js](routes/wallet.routes.js) | `router.post('/', writeLimiter, createWallet)` |
| Key pair generation via `crypto.generateKeyPairSync` (`secp256k1`) | [utils/crypto.js](utils/crypto.js) | `generateKeyPair()` — line 30 |
| `Transaction.signTransaction(signingKey)` | [models/blockchain.js](models/blockchain.js) | `Transaction.signTransaction()` — line 90 |
| `Transaction.isValid()` — demo bypass **removed** | [models/blockchain.js](models/blockchain.js) | `Transaction.isValid()` — line 118 |
| `Blockchain.addTransaction()` rejects unsigned transactions | [models/blockchain.js](models/blockchain.js) | `Blockchain.addTransaction()` — line 186 |
| New route follows `routes/ → controllers/` pattern | [routes/wallet.routes.js](routes/wallet.routes.js), [controllers/wallet.controller.js](controllers/wallet.controller.js) | — |
| Uses `sendSuccess` / `sendError` response helpers | [controllers/wallet.controller.js](controllers/wallet.controller.js) | `sendCreated(res, ...)` — line 16 |

### Frontend

| INSTRUCTIONS.md item | File | Function / line |
|---|---|---|
| `Wallet` component calls `POST /api/wallets` | [src/components/Wallet.js](src/components/Wallet.js) | `handleCreate()` — line 19 |
| Displays public key (wallet address) | [src/components/Wallet.js](src/components/Wallet.js) | JSX — line 58 |
| Fetches balance from `GET /api/balance/:address` | [src/components/Wallet.js](src/components/Wallet.js) | `refreshBalance()` — line 33 |
| Private key stored in component state only (never sent back) | [src/components/Wallet.js](src/components/Wallet.js) | `onWalletCreated({ publicKey, privateKey })` — line 24 |
| `TransactionForm` signs with private key before submitting | [src/components/TransactionForm.js](src/components/TransactionForm.js) | `handleSubmit()` — line 17 |
| Client-side signing via `@noble/secp256k1` | [src/utils/crypto.js](src/utils/crypto.js) | `signTransaction()` — line 48 |
| Transaction hash matches backend | [src/utils/crypto.js](src/utils/crypto.js) | `calculateTransactionHash()` — line 38 |

### Key / Signature Formats

| Field | Format | Length | Where set |
|---|---|---|---|
| `publicKey` / address | uncompressed EC point `04‖x‖y` (hex) | 130 chars | [utils/crypto.js:38](utils/crypto.js) |
| `privateKey` | raw secp256k1 scalar (hex) | 64 chars | [utils/crypto.js:39](utils/crypto.js) |
| `signature` | IEEE-P1363 compact `r‖s` (hex) | 128 chars | [models/blockchain.js:94](models/blockchain.js) |

---

## Task 2 — Blockchain Persistence

| INSTRUCTIONS.md item | File | Function / line |
|---|---|---|
| `save(blockchain)` — serialises chain + pending txns to disk | [services/persistence.service.js](services/persistence.service.js) | `save()` — line 49 |
| `load()` — reads + rehydrates; returns `null` if no file | [services/persistence.service.js](services/persistence.service.js) | `load()` — line 79 |
| `clear()` — deletes saved state | [services/persistence.service.js](services/persistence.service.js) | `clear()` — line 113 |
| JSDoc comment documenting file shape | [services/persistence.service.js](services/persistence.service.js) | lines 1–33 |
| `models/index.js` calls `load()` on startup | [models/index.js](models/index.js) | `restorePersistedState()` — line 50 |
| Falls back to fresh / demo data on failure | [models/index.js](models/index.js) | `if (!restorePersistedState()) seedDemoData()` — line 98 |
| `save()` called after every mine | [models/index.js](models/index.js) | `persistAfter('minePendingTransactions')` — line 95 |
| `save()` called after every new transaction | [models/index.js](models/index.js) | `persistAfter('addTransaction')` — line 95 |
| File not found → fresh start, no crash | [services/persistence.service.js](services/persistence.service.js) | `ENOENT` branch — line 84 |
| Corrupt JSON → log warning, fresh start, no crash | [services/persistence.service.js](services/persistence.service.js) | JSON parse catch — line 101 |
| Loaded chain fails `isChainValid()` → log warning, fresh start | [models/index.js](models/index.js) | `if (!restored.isChainValid())` — line 60 |
| All I/O errors caught — server never crashes | [services/persistence.service.js](services/persistence.service.js) | try/catch on all exported fns |
| Logger used for save / load / error events | [services/persistence.service.js](services/persistence.service.js) | `logger.debug / info / warn / error` throughout |
| No persistence logic in `server.js` or controllers | [models/index.js](models/index.js) | composition root only |

### Persistence File Shape (`blockchain.json`)

```json
{
  "difficulty": 2,
  "miningReward": 100,
  "chain": [
    {
      "timestamp": 1700000000000,
      "transactions": [
        { "fromAddress": "04..", "toAddress": "04..", "amount": 100,
          "timestamp": 1700000000000, "signature": "abcd.." }
      ],
      "previousHash": "0",
      "nonce": 42,
      "hash": "00ab.."
    }
  ],
  "pendingTransactions": []
}
```

### Startup Sequence

```
models/index.js (imported at server start)
  ├── Create Blockchain singleton
  ├── persistAfter('addTransaction')           → auto-save on every new tx
  ├── persistAfter('minePendingTransactions')  → auto-save on every mine
  ├── restorePersistedState()
  │   ├── persistence.load()  →  Blockchain | null
  │   ├── restored.isChainValid()
  │   └── adoptState(restored) into singleton
  └── if not restored → seedDemoData()
       └── generateKeyPair × 2, mine, add signed txns, mine
```

---

## Phase 3 — Documentation

| INSTRUCTIONS.md item | File | Status |
|---|---|---|
| `## Changes` section in README | [README.md](README.md) | ✅ |
| New env vars documented | [README.md](README.md), [.env.example](.env.example) | ✅ |
| JSDoc on every new function | all new files | ✅ |
| Known limitations / trade-offs | [README.md](README.md) | ✅ |

---

## Full API Surface

| Method | Path | Controller | Middleware |
|---|---|---|---|
| GET | `/health` | inline | — |
| GET | `/api/chain` | `blockchain.controller.getChain` | apiLimiter |
| GET | `/api/chain/valid` | `blockchain.controller.validateChain` | apiLimiter |
| POST | `/api/transactions` | `transaction.controller.addTransaction` | writeLimiter, validateBody |
| GET | `/api/transactions/pending` | `transaction.controller.getPendingTransactions` | apiLimiter |
| GET | `/api/transactions/all` | `transaction.controller.getAllTransactions` | apiLimiter |
| POST | `/api/wallets` | `wallet.controller.createWallet` | writeLimiter |
| POST | `/api/wallets/gift` | `wallet.controller.giftCoins` | writeLimiter, validateBody — **dev only** |
| POST | `/api/mine` | `mining.controller.mineBlock` | writeLimiter, validateBody |
| GET | `/api/balance/:address` | `balance.controller.getBalance` | apiLimiter, validateParams |
| GET | `/api/stats` | `stats.controller.getStats` | apiLimiter |
| GET | `/api/fee` | `fee.controller.getFee` | apiLimiter |

---

## Test Coverage

| Suite | File | What it covers |
|---|---|---|
| Key generation | [__tests__/wallet-crypto.test.js](__tests__/wallet-crypto.test.js) | `generateKeyPair`, signing, `isValid`, `addTransaction` |
| Persistence | [__tests__/persistence.test.js](__tests__/persistence.test.js) | `save`/`load`/`clear`, corrupt file, tampered chain |
| Wallet controller | [__tests__/wallet.controller.test.js](__tests__/wallet.controller.test.js) | `POST /api/wallets` response shape |
| Blockchain controller | [__tests__/blockchain.controller.test.js](__tests__/blockchain.controller.test.js) | `getChain`, `validateChain` |
| Transaction controller | [__tests__/transaction.controller.test.js](__tests__/transaction.controller.test.js) | `addTransaction` validation, `getPendingTransactions`, `getAllTransactions` |
| Balance controller | [__tests__/balance.controller.test.js](__tests__/balance.controller.test.js) | `getBalance` valid/invalid address |
| Mining controller | [__tests__/mining.controller.test.js](__tests__/mining.controller.test.js) | `mineBlock` success + error path |
| Stats controller | [__tests__/stats.controller.test.js](__tests__/stats.controller.test.js) | `getStats` response shape |
| Fee controller | [__tests__/fee.controller.test.js](__tests__/fee.controller.test.js) | `getFee` response shape |

Run: `npm test`

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3002` | API server port |
| `NODE_ENV` | `development` | Runtime environment |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `BLOCKCHAIN_DIFFICULTY` | `2` | Proof-of-work difficulty (leading zeros) |
| `BLOCKCHAIN_MINING_REWARD` | `100` | Coins awarded per mined block |
| `INITIAL_MINER_ADDRESS` | `genesis-miner` | Address for the genesis reward (demo only) |
| `FEE_AMOUNT` | `100` | Principal used to compute the displayed fee |
| `FEE_PERCENTAGE` | `2.5` | Fee rate in percent |
| `FAUCET_GIFT_AMOUNT` | `500` | Coins added per gift request (dev only) |
| `BLOCKCHAIN_PERSISTENCE` | `true` | Set `false` to disable save/load |
| `BLOCKCHAIN_DATA_FILE` | `<root>/blockchain.json` | Override the persistence file path |
| `SEED_DEMO_DATA` | `true` | Set `false` to start with an empty chain |

---

## Known Limitations

1. **Synchronous persistence I/O** — `fs.*Sync` keeps writes ordered but blocks
   the event loop on each mutation. Fine for this app's payload; a high-throughput
   chain would need batched/async writes.
2. **No balance enforcement** — `addTransaction` validates the signature but not
   whether the sender can afford the amount.
3. **Browser-only key storage** — the private key lives in React state and is
   lost on page refresh. No encrypted keystore is provided.
4. **Single-node** — no peer-to-peer networking; the chain exists on one server.
5. **`isValidAddress` is permissive** — the backend validator only checks for a
   non-empty string; the cryptographic check happens inside `Transaction.isValid()`
   when the signature is verified against the address as a public key.
