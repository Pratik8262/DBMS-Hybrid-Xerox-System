/**
 * src/utils/network.js
 * 
 * Utility functions for network-related operations.
 */

const os = require('os');

/**
 * Get the first non-internal IPv4 address of the current machine.
 * Useful for identifying the local server's IP in a LAN.
 * 
 * @returns {string} - IPv4 address or '127.0.0.1' as fallback
 */
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Look for IPv4 and non-internal (skip loopback)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return '127.0.0.1';
}

module.exports = {
  getLocalIp,
};
