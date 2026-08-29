const axios = require('axios');
const Payment = require('../models/Payment');

const TRONGRID_BASE = process.env.TRON_NETWORK === 'testnet'
  ? 'https://nile.trongrid.io'
  : 'https://api.trongrid.io';

async function fetchIncomingTransfers(address) {
  const url = `${TRONGRID_BASE}/v1/accounts/${address}/transactions/trc20`;
  const res = await axios.get(url, {
    params: {
      limit: 50,
      contract_address: process.env.USDT_CONTRACT,
      only_to: true,
      order_by: 'block_timestamp,desc',
    },
    headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
  });

  const transfers = res.data?.data || [];
  return transfers
    .filter((tx) => tx.to === address)
    .map((tx) => ({
      txId: tx.transaction_id,
      amount: Number(tx.value) / 1e6,
      from: tx.from,
    }));
}

async function checkPendingPayments() {
  try {
    const now = new Date();

    await Payment.updateMany(
      { status: 'PENDING', expiresAt: { $lte: now } },
      { $set: { status: 'EXPIRED' } }
    );

    const pendingPayments = await Payment.find({ status: 'PENDING' });
    if (pendingPayments.length === 0) return;

    const transfers = await fetchIncomingTransfers(process.env.CLIENT_MASTER_ADDRESS);
    if (transfers.length === 0) return;

    const usedTxIds = new Set();

    for (const payment of pendingPayments) {
      const match = transfers.find(
        (t) => !usedTxIds.has(t.txId) && Math.abs(t.amount - payment.expectedAmount) < 1e-6
      );
      if (!match) continue;

      const claimed = await Payment.findOneAndUpdate(
        { _id: payment._id, status: 'PENDING' },
        { $set: { status: 'PAID', incomingTxId: match.txId, fromAddress: match.from } },
        { new: true }
      );
      if (claimed) {
        usedTxIds.add(match.txId);
        console.log(`Payment confirmed for invoice ${claimed._id}: tx ${match.txId} from ${match.from} (${match.amount} USDT)`);
      }
    }
  } catch (error) {
    console.error('Listener error:', error.message);
  }
}

function startListener() {
  console.log(`TronGrid Blockchain Listener active on ${process.env.TRON_NETWORK} (single-address mode)...`);
  setInterval(checkPendingPayments, 20000);
}

module.exports = { startListener };