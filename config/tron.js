const { TronWeb } = require('tronweb');

const NETWORKS = {
  mainnet: 'https://api.trongrid.io',
  testnet: 'https://nile.trongrid.io',
};

function getTronWeb(privateKey) {
  const network = process.env.TRON_NETWORK || 'mainnet';
  if (!NETWORKS[network]) {
    throw new Error(`Invalid TRON_NETWORK "${network}". Use "mainnet" or "testnet".`);
  }
  const tronWeb = new TronWeb({
    fullHost: NETWORKS[network],
    headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
    ...(privateKey ? { privateKey } : {}),
  });
  if (!privateKey && process.env.CLIENT_MASTER_ADDRESS) {
    tronWeb.setAddress(process.env.CLIENT_MASTER_ADDRESS);
  }
  return tronWeb;
}

module.exports = { getTronWeb };