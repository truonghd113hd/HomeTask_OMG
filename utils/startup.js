/* eslint-env node */
const { spawn } = require('child_process');
const path = require('path');
const logger = require('./logger');

function runStartupTasks(config) {
  try {
    const workerPath = path.join(__dirname, 'startup-worker.js');
    // Spawn a detached worker so it runs independently of the main server process
    const child = spawn(process.execPath, [workerPath], {
      detached: true,
      stdio: 'ignore',
      env: Object.assign({}, process.env, {
        // pass a minimal set of values if the worker needs them
        STARTUP_FEE_AMOUNT: String(config.fee?.defaultAmount || ''),
        STARTUP_FEE_PERCENT: String(config.fee?.defaultPercentage || ''),
      }),
    });
    child.unref();
    logger.info('Startup worker launched.');
  } catch (err) {
    logger.warn(`Failed to spawn startup worker: ${err && err.message}`);
    // Fallback: run synchronously in-process so startup still completes
    try {
      const { computeFee } = require('./fee');
      const fee = computeFee(config.fee.defaultAmount, config.fee.defaultPercentage);
      config.computedFee = fee;
      logger.info(`Default fee computed (fallback): ${fee}`);
    } catch (e) {
      logger.warn(`Fallback startup task failed: ${e && e.message}`);
    }
  }
}

module.exports = { runStartupTasks };
