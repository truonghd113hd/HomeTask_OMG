 # HomeTask at One More Game

 A simple blockchain learning project with an Express backend and a React frontend. This README reflects recent changes made to the repo (startup fee computation, added helper, and security notes).

 See also: [INSTRUCTIONS.md](./INSTRUCTIONS.md) and [SETUP.md](./SETUP.md).

 ## Project overview

 - Backend: Node.js + Express — API lives in the repository root and serves the built React app in production.
 - Frontend: React (create-react-app / `react-scripts`) — source under `src/`.

 Core folders:
 - `config/` — runtime configuration (ports, blockchain defaults, fee defaults)
 - `models/` — domain classes (Block, Transaction, Blockchain)
 - `controllers/`, `routes/`, `middleware/` — normal Express layering
 - `utils/` — helpers including `logger.js`, `response.js`, and `fee.js`
 - `src/` — React app

 ---

 ## Getting started

 ### Prerequisites

 - Node.js v16+ (v18 or v22 recommended)
 - npm

 ### Install

 ```powershell
npm install
 ```

 Note: `npm install` may report vulnerabilities from transitive dependencies — review `npm audit` as appropriate.

 ### Run the app in development

 Open two terminals:

 Terminal 1 — React dev server (http://localhost:3000):
 ```powershell
 npm start
 ```

 Terminal 2 — API server with auto-reload (http://localhost:3002):
 ```powershell
 npm run dev
 ```

 The API server logs startup information and computes a startup fee (logged as `Startup Fee : <value>`). The React dev server proxies `/api/*` requests to the API in development via `src/setupProxy.js`.

 ### Production

 Build the frontend and serve from the API server on a single port:
 ```powershell
 npm run serve
 ```

 ---

 ## Configuration

 Main runtime config is in `config/index.js`. Relevant env vars:
 - `PORT` — API server port (default 3002)
 - `CORS_ORIGIN` — allowed origin for the frontend (default http://localhost:3000)
 - `BLOCKCHAIN_DIFFICULTY`, `BLOCKCHAIN_MINING_REWARD` — blockchain tuning
 - `FEE_AMOUNT`, `FEE_PERCENTAGE` — controls startup fee computation

 ---

 ## API (short)

 The API follows the structure in the original task. Responses use a common envelope `{ success: true, ... }`.

 Important endpoints (examples):
 - GET `/api/chain`
 - POST `/api/transactions` — body `{ fromAddress, toAddress, amount }`
 - POST `/api/mine` — body `{ miningRewardAddress }`
 - GET `/api/balance/:address`
 - GET `/health`

 See the `routes/` and `controllers/` folders for full details.

 ---

 ## Changes

 Two features were added on top of the original task: cryptographic wallets and
 blockchain persistence.

 ### 1. Cryptographic wallet system

 Plain-string addresses were replaced with real `secp256k1` key pairs and
 verified ECDSA signatures.

 - **`POST /api/wallets`** — generates a key pair with Node's built-in
   `crypto.generateKeyPairSync` and returns `{ publicKey, privateKey }`. The
   private key is returned once and never stored server-side.
 - **`utils/crypto.js`** (new) — centralises key generation and the conversion
   between wallet addresses and Node `KeyObject`s.
 - **`Transaction.signTransaction(privateKeyHex)`** — signs the transaction hash
   and rejects a key that does not own `fromAddress`.
 - **`Transaction.isValid()`** — the demo `return true` bypass for unsigned
   transactions was **removed**; every non-reward transaction must now carry a
   signature that verifies against its sender's public key.
 - **`Blockchain.addTransaction()`** — unsigned/invalid transactions are
   rejected (the controller surfaces this as `400` instead of `500`).
 - **Frontend** — a new `Wallet` component creates a wallet and shows its
   address/balance; `TransactionForm` signs locally with
   `@noble/secp256k1` (`src/utils/crypto.js`) before submitting. The private key
   never leaves the browser.

 Key/signature formats (client and server agree on these):

 | Field | Format | Length |
 |---|---|---|
 | `publicKey` / address | uncompressed EC point `04‖x‖y` (hex) | 130 |
 | `privateKey` | raw scalar (hex) | 64 |
 | `signature` | IEEE-P1363 compact `r‖s` (hex) | 128 |

 The signed transaction hash includes the `timestamp`, so the client sends the
 `timestamp` it signed and the server reuses it verbatim.

 ### 2. Blockchain persistence

 - **`services/persistence.service.js`** (new) — `save()`, `load()`, `clear()`.
   `load()` rehydrates plain JSON back into `Block` / `Transaction` instances
   (via new `fromJSON` factories) so their methods and hashes still validate.
 - **`models/index.js`** — on startup the chain is restored from disk; it falls
   back to a freshly seeded demo chain when there is no file, the file is
   corrupt, or the loaded chain fails `isChainValid()`. Saving is wired into the
   singleton (wrapping `addTransaction` / `minePendingTransactions`) so no
   persistence logic lives in `server.js` or any controller.
 - All file I/O is wrapped in try/catch and logged via `utils/logger.js` — a
   persistence failure never crashes the server.
 - State is stored in `blockchain.json` in the project root (now gitignored).

 ### New environment variables

 | Var | Default | Purpose |
 |---|---|---|
 | `BLOCKCHAIN_PERSISTENCE` | `true` | Set to `false` to disable saving/loading. |
 | `BLOCKCHAIN_DATA_FILE` | `<root>/blockchain.json` | Path to the persisted state file. |

 ### Tests

 `npm test` runs Jest. New suites cover wallet/signature logic
 (`__tests__/wallet-crypto.test.js`), persistence including corrupt/missing/
 tampered files (`__tests__/persistence.test.js`), and the wallet endpoint
 (`__tests__/wallet.controller.test.js`). Backend suites run under the `node`
 Jest environment.

 ### Known limitations / trade-offs

 - **Synchronous persistence I/O.** `save()`/`load()` use `fs.*Sync` so writes
   after each mutation stay ordered and the file never tears. For this app's
   tiny payload that is fine; a high-throughput chain would want batched/async
   writes.
 - **No balance enforcement.** As in the original, `addTransaction` does not
   check that a sender can afford the amount — only that the signature is valid.
 - **Browser key handling.** The private key lives in React state only and is
   lost on refresh; there is no encrypted keystore or persistence of wallets.
 - **`jest-environment-jsdom`** was added as a dev dependency to match Jest 29
   (the transitive copy pulled in by `react-scripts` is for Jest 27 and could
   not run the suite).

 ---

 ## Troubleshooting

 **Server crashes on boot**
 - Ensure dependencies are installed (`npm install`).

 **Port already in use**
 ```powershell
 $env:PORT='3003'; npm run dev
 ```

 **Frontend can't reach the API**
 - Confirm the API server is running and the port matches `src/setupProxy.js` (or your `PORT`).

 **Chain resets on restart**
 - State is persisted to `blockchain.json` (see the Changes section). If it is not surviving restarts, check that `BLOCKCHAIN_PERSISTENCE` is not set to `false` and that the process can write to `BLOCKCHAIN_DATA_FILE`.

 ---

 ## License

 OMG — for learning and assessment purposes.
