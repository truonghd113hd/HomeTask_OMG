/**
 * Client-side transaction signing.
 *
 * Wallets are created on the server (`POST /api/wallets`) but transactions are
 * signed here, in the browser, so the private key never leaves the client.
 *
 * The signing scheme mirrors the backend exactly (see `models/blockchain.js`
 * and `utils/crypto.js`):
 *   - the signed hash is `sha256(fromAddress + toAddress + amount + timestamp)`
 *   - the signature is an IEEE-P1363 compact `r || s` value, hex-encoded
 * which is what Node's `crypto.verify(..., { dsaEncoding: 'ieee-p1363' })`
 * expects on the server.
 */

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';

// @noble/secp256k1 v3 needs its hash primitives wired up explicitly (used for
// the SHA-256 digest and RFC-6979 deterministic nonces).
secp.hashes.sha256 = (msg) => sha256(msg);
secp.hashes.hmacSha256 = (key, msg) => hmac(sha256, key, msg);

const encoder = new TextEncoder();

const toHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex) => Uint8Array.from(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

/**
 * Recreates `Transaction.calculateHash()` from the backend.
 *
 * @returns {string} the SHA-256 transaction hash, hex-encoded.
 */
export const calculateTransactionHash = ({ fromAddress, toAddress, amount, timestamp }) =>
  toHex(sha256(encoder.encode(`${fromAddress}${toAddress}${amount}${timestamp}`)));

/**
 * Signs a transaction with the wallet's private key.
 *
 * @param {string} privateKeyHex - raw secp256k1 scalar (hex).
 * @param {object} tx - `{ fromAddress, toAddress, amount, timestamp }`.
 * @returns {string} the IEEE-P1363 signature, hex-encoded.
 */
export const signTransaction = (privateKeyHex, tx) => {
  const hashHex = calculateTransactionHash(tx);
  // The server verifies with `crypto.verify('SHA256', <hashBytes>, ...)`, which
  // hashes the data again, so we sign sha256(hashBytes) with prehash disabled.
  const messageHash = sha256(encoder.encode(hashHex));
  const signature = secp.sign(messageHash, hexToBytes(privateKeyHex), {
    prehash: false,
  });
  return toHex(signature);
};

/**
 * Derives the wallet address (uncompressed public key) from a raw private key,
 * so an existing wallet can be re-imported entirely client-side. The address
 * format (`04` + x + y) matches what the backend produces and verifies against.
 *
 * @param {string} privateKeyHex - raw 32-byte scalar, hex-encoded (64 chars).
 * @returns {string} the uncompressed EC point `04…` (130 hex chars).
 * @throws {Error} if the key is malformed or not a valid secp256k1 scalar.
 */
export const deriveAddress = (privateKeyHex) => {
  const key = (privateKeyHex || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(key)) {
    throw new Error('Private key must be 64 hexadecimal characters');
  }
  try {
    return toHex(secp.getPublicKey(hexToBytes(key), false)); // false = uncompressed
  } catch {
    throw new Error('Invalid private key');
  }
};
