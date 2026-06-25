const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const isValidAddress = (address) => isNonEmptyString(address);

// An uncompressed secp256k1 public key: '04' + 32-byte x + 32-byte y (hex).
const PUBLIC_KEY_PATTERN = /^04[0-9a-fA-F]{128}$/;

const isValidPublicKey = (value) =>
  isNonEmptyString(value) && PUBLIC_KEY_PATTERN.test(value.trim());

const isValidAmount = (amount) => {
  const parsed = parseFloat(amount);
  return !isNaN(parsed) && isFinite(parsed) && parsed > 0;
};

const sanitizeAddress = (address) => String(address).trim();

const sanitizeAmount = (amount) => parseFloat(amount);

module.exports = {
  isNonEmptyString,
  isValidAddress,
  isValidPublicKey,
  isValidAmount,
  sanitizeAddress,
  sanitizeAmount,
};
