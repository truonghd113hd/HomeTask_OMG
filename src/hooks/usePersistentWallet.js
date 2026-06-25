import { useState, useEffect } from 'react';

const STORAGE_KEY = 'blockchain.wallet';

/**
 * Reads a previously saved wallet from localStorage, returning `null` if there
 * is none or it is malformed.
 *
 * @returns {{ publicKey: string, privateKey: string } | null}
 */
const readStoredWallet = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.publicKey === 'string' && typeof parsed.privateKey === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * `useState` for the active wallet that also persists it to localStorage, so the
 * wallet survives a page refresh.
 *
 * Security note: the private key is stored unencrypted in localStorage. It is
 * never sent to the server, but this is a demo-grade trade-off — a production
 * wallet would use an encrypted keystore or never expose the key to JS.
 *
 * @returns {[wallet, setWallet]} same shape as `useState`.
 */
const usePersistentWallet = () => {
  const [wallet, setWallet] = useState(readStoredWallet);

  useEffect(() => {
    try {
      if (wallet) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* localStorage unavailable (private mode / disabled) — ignore */
    }
  }, [wallet]);

  return [wallet, setWallet];
};

export default usePersistentWallet;
