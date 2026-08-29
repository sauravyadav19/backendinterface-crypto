const REQUIRED_VARS = [
  'MONGO_URI',
  'PORT',
  'JWT_SECRET',
  'USDT_CONTRACT',
  'CLIENT_MASTER_ADDRESS',
  'TRONGRID_API_KEY',
  'TRON_NETWORK',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!['mainnet', 'testnet'].includes(process.env.TRON_NETWORK)) {
    console.error('TRON_NETWORK must be "mainnet" or "testnet"');
    process.exit(1);
  }
}

module.exports = { validateEnv };