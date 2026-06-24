/**
 * Elliptic-curve cryptography helpers for the wallet system.
 *
 * All wallets use the `secp256k1` curve (the same curve Bitcoin/Ethereum use)
 * via Node's built-in `crypto` module. Keys are exchanged with clients in raw
 * form so that browser libraries (e.g. `@noble/secp256k1`) can consume them:
 *
 *   - publicKey / address : uncompressed EC point `04 || x || y` (130 hex chars)
 *   - privateKey          : raw 32-byte scalar               (64  hex chars)
 *   - signature           : IEEE-P1363 compact `r || s`      (128 hex chars)
 *
 * Signatures produced by `@noble/secp256k1` on the client verify here because
 * both sides agree on the curve, the SHA-256 digest, and the P1363 encoding.
 */

const crypto = require('crypto');

const CURVE = 'secp256k1';
const ADDRESS_HEX_LENGTH = 130; // '04' + 32-byte x + 32-byte y

const hexToB64url = (hex) => Buffer.from(hex, 'hex').toString('base64url');
const b64urlToHex = (value) => Buffer.from(value, 'base64url').toString('hex');

/**
 * Generates a fresh secp256k1 key pair.
 *
 * @returns {{ publicKey: string, privateKey: string }} hex-encoded key pair,
 *   where `publicKey` is the wallet address (uncompressed point).
 */
const generateKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: CURVE,
  });

  const pub = publicKey.export({ format: 'jwk' });
  const priv = privateKey.export({ format: 'jwk' });

  return {
    publicKey: '04' + b64urlToHex(pub.x) + b64urlToHex(pub.y),
    privateKey: b64urlToHex(priv.d),
  };
};

/**
 * Splits an uncompressed-point address into base64url `x` / `y` coordinates.
 *
 * @param {string} address - uncompressed EC point hex (`04 || x || y`).
 * @returns {{ x: string, y: string }}
 * @throws {Error} if the address is not a well-formed uncompressed point.
 */
const coordinatesFromAddress = (address) => {
  if (
    typeof address !== 'string' ||
    address.length !== ADDRESS_HEX_LENGTH ||
    !address.startsWith('04')
  ) {
    throw new Error('Invalid public key address format');
  }

  return {
    x: hexToB64url(address.slice(2, 66)),
    y: hexToB64url(address.slice(66)),
  };
};

/**
 * Builds a Node public `KeyObject` from a wallet address.
 *
 * @param {string} address - uncompressed EC point hex.
 * @returns {import('crypto').KeyObject}
 */
const publicKeyFromAddress = (address) => {
  const { x, y } = coordinatesFromAddress(address);
  return crypto.createPublicKey({
    key: { kty: 'EC', crv: CURVE, x, y },
    format: 'jwk',
  });
};

/**
 * Builds a Node private `KeyObject` from a raw scalar plus the matching address
 * (the address supplies the public `x`/`y` coordinates JWK import requires).
 *
 * @param {string} privateKeyHex - raw 32-byte scalar, hex-encoded.
 * @param {string} address - the wallet address the key belongs to.
 * @returns {import('crypto').KeyObject}
 */
const privateKeyFromHex = (privateKeyHex, address) => {
  const { x, y } = coordinatesFromAddress(address);
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: CURVE, d: hexToB64url(privateKeyHex), x, y },
    format: 'jwk',
  });
};

/**
 * Derives the wallet address (uncompressed point) from a private `KeyObject`.
 * Used to confirm a private key actually owns the address it claims to sign for.
 *
 * @param {import('crypto').KeyObject} privateKeyObject
 * @returns {string} uncompressed EC point hex.
 */
const addressFromPrivateKey = (privateKeyObject) => {
  const pub = crypto.createPublicKey(privateKeyObject).export({ format: 'jwk' });
  return '04' + b64urlToHex(pub.x) + b64urlToHex(pub.y);
};

module.exports = {
  CURVE,
  ADDRESS_HEX_LENGTH,
  generateKeyPair,
  publicKeyFromAddress,
  privateKeyFromHex,
  addressFromPrivateKey,
};
