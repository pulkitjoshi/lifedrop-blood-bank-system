const express = require('express');
const { getDB, saveDB } = require('../db');
const { computeInventory, batchStatus } = require('../lib/blood');
const { LOW_STOCK_THRESHOLD } = require('../constants');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  const inv = computeInventory(db.batches);
  const withFlags = {};
  Object.keys(inv).forEach(g => {
    withFlags[g] = { units: inv[g], low: inv[g] < LOW_STOCK_THRESHOLD };
  });
  res.json(withFlags);
});

router.get('/batches', (req, res) => {
  const db = getDB();
  let batches = [...db.batches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  if (req.query.bloodGroup) batches = batches.filter(b => b.bloodGroup === req.query.bloodGroup);
  res.json(batches.map(b => ({ ...b, status: batchStatus(b) })));
});

router.delete('/batches/:id', (req, res) => {
  const db = getDB();
  const batch = db.batches.find(b => b.id === req.params.id);
  if (!batch) return res.status(404).json({ error: 'Batch not found.' });
  db.batches = db.batches.filter(b => b.id !== req.params.id);
  saveDB(db);
  res.status(204).end();
});

module.exports = router;
