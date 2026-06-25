/* eslint-env node */

/**
 * Runs before every test file (see `setupFiles` in jest.config.js).
 *
 * Tests that import the blockchain singleton (`require('../models')`) would
 * otherwise auto-save to the real `blockchain.json` in the project root. Disable
 * default persistence so the suite stays hermetic — the persistence service is
 * still tested directly with explicit temp files in persistence.test.js.
 */
process.env.BLOCKCHAIN_PERSISTENCE = process.env.BLOCKCHAIN_PERSISTENCE || 'false';
