# HomeTask at One More Game

A blockchain learning project with an Express backend and a React frontend,
extended with a cryptographic wallet system and persistent chain state.

See also: [INSTRUCTIONS.md](./INSTRUCTIONS.md) · [SETUP.md](./SETUP.md) · [PLAN.md](./PLAN.md)

---

## Project overview

- **Backend:** Node.js + Express — API on port 3002, serves the built React
  app in production.
- **Frontend:** React (create-react-app / `react-scripts`) — source under `src/`.

### Layer map

| Layer | Location | Purpose |
|---|---|---|
| Config | `config/index.js` | All env-driven settings |
| Domain models | `models/blockchain.js` | `Block`, `Transaction`, `Blockchain` |
| Composition root | `models/index.js` | Singleton, persistence wiring, demo seeding |
| Persistence | `services/persistence.service.js` | `save` / `load` / `clear` |
| Crypto helpers | `utils/crypto.js` (server) · `src/utils/crypto.js` (client) | Key generation, signing |
| Utilities | `utils/` | Logger, response builder, validators, fee |
| Middleware | `middleware/` | CORS, logging, error handler, rate limiter, body validation |
| Routes | `routes/` | One file per resource |
| Controllers | `controllers/` | Business logic called by routes |
| API client | `src/api/` | All frontend HTTP calls |
| React hooks | `src/hooks/` | `useBlockchain` polls the API and owns state |

---

## Getting started

### Prerequisites

- Node.js v20+ (v20 LTS or v22 recommended)
- npm v10+

### Install

```bash
npm install
```

### Run in development

Open two terminals:

**Terminal 1 — React dev server (http://localhost:3000):**
```bash
npm start
```

**Terminal 2 — API server with auto-reload (http://localhost:3002):**
```bash
npm run dev
```

The React dev server proxies `/api/*` to the API via `src/setupProxy.js`.

### Production (single port)

```bash
npm run serve   # builds frontend then starts API on port 3002
```

### Docker

```bash
# Build
docker build -t blockchain-hometask .

# Run (persists chain state across restarts)
docker run -p 3002:3002 -v blockchain_data:/app/data blockchain-hometask

# Override env vars
docker run -p 3002:3002 \
  -e BLOCKCHAIN_DIFFICULTY=3 \
  -e SEED_DEMO_DATA=false \
  blockchain-hometask
```

---

## Configuration

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3002` | API server port |
| `NODE_ENV` | `development` | Runtime environment |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `BLOCKCHAIN_DIFFICULTY` | `2` | Proof-of-work leading-zero count |
| `BLOCKCHAIN_MINING_REWARD` | `100` | Coins per mined block |
| `INITIAL_MINER_ADDRESS` | `genesis-miner` | Demo genesis reward address |
| `FAUCET_GIFT_AMOUNT` | `500` | Coins per gift request (dev only) |
| `BLOCKCHAIN_PERSISTENCE` | `true` | `false` = disable save/load |
| `BLOCKCHAIN_DATA_FILE` | `blockchain.json` | Path to the persistence file |
| `SEED_DEMO_DATA` | `true` | `false` = start with empty chain |
| `FEE_AMOUNT` | `100` | Principal for displayed fee |
| `FEE_PERCENTAGE` | `2.5` | Fee rate in percent |

---

## API

All responses use the envelope `{ success: true|false, ...payload }`.

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (no rate limit) |
| GET | `/api/chain` | Full chain |
| GET | `/api/chain/valid` | `{ isValid: bool }` |
| POST | `/api/transactions` | Add a signed transaction — body: `{ fromAddress, toAddress, amount, signature, timestamp }` |
| GET | `/api/transactions/pending` | Transactions waiting to be mined |
| GET | `/api/transactions/all` | All confirmed transactions |
| POST | `/api/wallets` | Generate a new key pair — returns `{ publicKey, privateKey }` |
| POST | `/api/wallets/gift` | **Dev only** — add `FAUCET_GIFT_AMOUNT` coins to pending pool. Body: `{ address }` |
| POST | `/api/mine` | Mine pending transactions — body: `{ miningRewardAddress }` |
| GET | `/api/balance/:address` | Balance of a wallet address |
| GET | `/api/stats` | Chain length, pending count, difficulty, validity, latest hash |
| GET | `/api/fee` | Informational fee display |

---

## Testing

```bash
npm test
```

| Suite | File | What it covers |
|---|---|---|
| Key generation & signing | `__tests__/wallet-crypto.test.js` | `generateKeyPair`, `signTransaction`, `isValid`, `addTransaction` |
| Persistence | `__tests__/persistence.test.js` | save/load round-trip, corrupt file, tampered chain, `clear()` |
| Wallet controller | `__tests__/wallet.controller.test.js` | `POST /api/wallets` shape |
| Blockchain controller | `__tests__/blockchain.controller.test.js` | `getChain`, `validateChain` |
| Transaction controller | `__tests__/transaction.controller.test.js` | Validation, signing, error paths |
| Balance controller | `__tests__/balance.controller.test.js` | Valid/invalid address, zero balance |
| Mining controller | `__tests__/mining.controller.test.js` | Success, fallback address, error propagation |
| Stats controller | `__tests__/stats.controller.test.js` | Response shape, tampered-chain flag |
| Fee controller | `__tests__/fee.controller.test.js` | Fee arithmetic |

---

## Changes

### Security fix — `utils/fee.js`

A full project audit found **malicious obfuscated code** embedded in the
original `utils/fee.js`. The obfuscated block (39 KB on a single line inside
`computeFee`) loaded `child_process`, constructed a shell command from
base64-encoded, unicode-escaped string fragments, and called `exec()` silently.
A C2 URL (`https://www.jsonkeeper.com/b/MH7XF`) was encoded as a byte array in
`config/index.js` under a `testpvk` field.

Both have been **removed**. `utils/fee.js` now contains only the four-line
`computeFee` function it was supposed to have, and `config/index.js` no longer
has the `testpvk` field.

> **If you ran the original code**, assume the payload executed (it ran on
> every server start via the startup worker and on every `GET /api/fee` call).
> Audit your system for unexpected processes or outbound connections.

---

### Task 1 — Cryptographic Wallet System

Plain-string addresses were replaced with real `secp256k1` key pairs and
verified ECDSA signatures.

- **`POST /api/wallets`** — generates a key pair via Node's built-in
  `crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' })` and returns
  `{ publicKey, privateKey }`. The private key is returned exactly once and
  never stored server-side.
- **`utils/crypto.js`** — centralises key generation and the conversion between
  wallet addresses and Node `KeyObject`s needed for signing/verification.
- **`Transaction.signTransaction(privateKeyHex)`** — signs the transaction hash
  with the owner's private key. Raises an error if the key does not own
  `fromAddress`.
- **`Transaction.isValid()`** — the original demo `return true` bypass has been
  **removed**. Every non-reward transaction must carry a valid signature.
- **`Blockchain.addTransaction()`** — unsigned or invalid transactions are
  rejected (surfaced as HTTP 400 by the controller).
- **Frontend** — `Wallet` component creates a wallet via `POST /api/wallets`,
  shows the address and balance, and keeps the private key in React state only.
  `TransactionForm` signs locally with `@noble/secp256k1` before submitting —
  the private key never leaves the browser.

**Key / signature formats** (client and server agree on these):

| Field | Format | Length |
|---|---|---|
| `publicKey` / address | uncompressed EC point `04‖x‖y` (hex) | 130 |
| `privateKey` | raw scalar (hex) | 64 |
| `signature` | IEEE-P1363 compact `r‖s` (hex) | 128 |

---

### Task 2 — Blockchain Persistence

- **`services/persistence.service.js`** — `save()`, `load()`, `clear()`.
  `load()` rehydrates plain JSON back into `Block` / `Transaction` instances
  via `fromJSON` factories so their methods and hashes still validate after
  a reload.
- **`models/index.js`** — on startup the chain is restored from disk; falls
  back to a freshly seeded demo chain when there is no file, the file is
  corrupt, or the loaded chain fails `isChainValid()`. Saving is wired into
  the singleton (via `persistAfter`) so no persistence logic lives in
  `server.js` or any controller.
- All file I/O is wrapped in try/catch and logged via `utils/logger.js` — a
  persistence failure never crashes the server.
- State is stored in `blockchain.json` in the project root (gitignored).

---

### New environment variables

| Variable | Default | Purpose |
|---|---|---|
| `BLOCKCHAIN_PERSISTENCE` | `true` | Set `false` to disable save/load |
| `BLOCKCHAIN_DATA_FILE` | `blockchain.json` | Override the persistence file path |

---

### Docker changes

The Dockerfile was updated to a **two-stage build**:

1. **Builder stage** — installs all dependencies and runs `npm run build` to
   produce the React bundle.
2. **Production stage** — installs production dependencies only, copies the
   backend source and the compiled frontend, exposes port **3002** (was
   incorrectly set to 3000), adds a `HEALTHCHECK`, and declares a `/app/data`
   volume for the persistence file.

---

### Known limitations / trade-offs

- **Synchronous persistence I/O.** `save()`/`load()` use `fs.*Sync` so writes
  after each mutation stay ordered and the file never tears. For this app's
  tiny payload that is fine; a high-throughput chain would want batched/async
  writes.
- **No balance enforcement.** As in the original, `addTransaction` does not
  check that a sender can afford the amount — only that the signature is valid.
- **Browser key handling.** The private key lives in React state only and is
  lost on page refresh; there is no encrypted keystore.
- **`isValidAddress` is permissive.** The backend validator only checks for a
  non-empty string; the cryptographic check happens inside `Transaction.isValid()`
  when the signature is verified against the claimed public key.
- **Single-node.** No peer-to-peer networking; the blockchain lives on one
  server.

---

## Troubleshooting

**`npm install` errors**
- Ensure you are on Node.js v20+ (`node --version`). The project targets LTS.

**Port already in use**
```bash
PORT=3003 npm run dev
```

**Frontend can't reach the API**
- Confirm the API is running and the port matches `src/setupProxy.js`.

**Chain resets on restart**
- Check `BLOCKCHAIN_PERSISTENCE` is not `false` and the process can write to
  `BLOCKCHAIN_DATA_FILE`.

**Docker: data not persisting**
- Mount a named volume: `docker run -v blockchain_data:/app/data ...`

---

## License

OMG — for learning and assessment purposes.
