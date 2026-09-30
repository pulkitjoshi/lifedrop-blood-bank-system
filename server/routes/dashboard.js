const express = require('express');
const { getDB } = require('../db');
const { computeInventory, isEligible, batchStatus } = require('../lib/blood');
const { BLOOD_GROUPS, LOW_STOCK_THRESHOLD, EXPIRING_SOON_DAYS } = require('../constants');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const inv = computeInventory(db.batches);
  const totalUnits = Object.values(inv).reduce((a, b) => a + b, 0);
  const pending = db.requests.filter(r => r.status === 'pending').length;
  const expiredBatches = db.batches.filter(b => batchStatus(b) === 'expired').length;
  const expiringSoon = db.batches.filter(b => batchStatus(b) === 'expiring').length;

  const alerts = [];
  BLOOD_GROUPS.forEach(g => {
    if (inv[g] === 0) alerts.push({ text: `⚠ ${g} is out of stock.`, ok: false });
    else if (inv[g] < LOW_STOCK_THRESHOLD) alerts.push({ text: `⚠ ${g} is low (${inv[g]} units left).`, ok: false });
  });
  if (expiringSoon > 0) alerts.push({ text: `⏳ ${expiringSoon} batch(es) expiring within ${EXPIRING_SOON_DAYS} days.`, ok: false });
  const criticalPending = db.requests.filter(r => r.status === 'pending' && r.urgency === 'critical').length;
  if (criticalPending > 0) alerts.push({ text: `🚨 ${criticalPending} critical request(s) awaiting approval.`, ok: false });
  if (alerts.length === 0) alerts.push({ text: '✓ All stock levels healthy. No urgent alerts.', ok: true });

  res.json({
    stats: {
      totalDonors: db.donors.length,
      eligibleDonors: db.donors.filter(isEligible).length,
      totalUnits,
      pendingRequests: pending,
      totalRequests: db.requests.length,
      totalDonations: db.donations.length,
      expiredBatches,
    },
    inventory: inv,
    alerts,
    activity: db.activity.slice(0, 15),
  });
});

module.exports = router;
