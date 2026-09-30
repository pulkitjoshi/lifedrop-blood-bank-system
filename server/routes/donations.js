const express = require('express');
const { randomUUID } = require('crypto');
const { getDB, saveDB } = require('../db');
const { isEligible, eligibleInDays, todayStr } = require('../lib/blood');
const { SHELF_LIFE_DAYS } = require('../constants');

const router = express.Router();

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

router.get('/', (req, res) => {
  const db = getDB();
  const list = [...db.donations].sort((a, b) => b.date.localeCompare(a.date));
  res.json(list);
});

router.post('/', (req, res) => {
  const { donorId, units, date, center, force } = req.body;
  if (!donorId || !units || units < 1 || !date || !center) {
    return res.status(400).json({ error: 'donorId, units, date and center are required.' });
  }
  const db = getDB();
  const donor = db.donors.find(d => d.id === donorId);
  if (!donor) return res.status(404).json({ error: 'Donor not found.' });

  if (!isEligible(donor) && !force) {
    return res.status(409).json({
      error: 'Donor is not yet eligible.',
      eligibleInDays: eligibleInDays(donor),
      requiresConfirmation: true,
    });
  }

  const expiryDate = addDaysStr(date, SHELF_LIFE_DAYS);
  const donationId = randomUUID();
  const donation = { id: donationId, donorId: donor.id, donorName: donor.name, bloodGroup: donor.bloodGroup, units, date, center };
  const batch = { id: randomUUID(), bloodGroup: donor.bloodGroup, units, collectedDate: date, expiryDate, donationId };

  db.donations.push(donation);
  db.batches.push(batch);
  donor.totalDonations += 1;
  if (!donor.lastDonationDate || date > donor.lastDonationDate) donor.lastDonationDate = date;

  db.activity.unshift({ ts: Date.now(), text: `<b>${donor.name}</b> donated ${units} unit(s) of ${donor.bloodGroup}.` });
  saveDB(db);
  res.status(201).json(donation);
});

module.exports = router;
