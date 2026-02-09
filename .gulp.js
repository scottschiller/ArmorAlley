/**
 * HACKISH: "fancy output" shenanigans, progress bar etc.
 * specify `gulp --verbose` for classic console output.
 */
if (!process.argv.includes('--verbose')) {
  module.exports = {
    // disable timestamps entirely in gulp console output.
    timestamp: () => false
  };
}
