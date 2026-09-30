const express = require('express');
const { randomUUID } = require('crypto');
const { getDB, saveDB } = require('../db');
const { isEligible, eligibleInDays } = require('../lib/blood');

const router = express.Router();

function serialize(donor) {
  return { ...donor, eligible: isEligible(donor), eligibleInDays: isEligible(donor) ? 0 : eligibleInDays(donor) };
}

router.get('/', (req, res) => {
  const db = getDB();
  res.json(db.donors.map(serialize));
});

router.post('/', (req, res) => {
  const { name, age, gender, bloodGroup, phone, email, address } = req.body;
  if (!name || !age || !phone || !bloodGroup) {
    return res.status(400).json({ error: 'name, age, phone and bloodGroup are required.' });
  }
  if (age < 18 || age > 65) {
    return res.status(400).json({ error: 'Donor age must be between 18 and 65.' });
  }
  const db = getDB();
  const donor = {
    id: randomUUID(), name, age, gender: gender || 'Other', bloodGroup,
    phone, email: email || '', address: address || '',
    lastDonationDate: null, totalDonations: 0,
  };
  db.donors.push(donor);
  db.activity.unshift({ ts: Date.now(), text: `New donor <b>${name}</b> registered.` });
  saveDB(db);
  res.status(201).json(serialize(donor));
});

router.put('/:id', (req, res) => {
  const db = getDB();
  const donor = db.donors.find(d => d.id === req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found.' });
  const { name, age, gender, bloodGroup, phone, email, address } = req.body;
  if (age !== undefined && (age < 18 || age > 65)) {
    return res.status(400).json({ error: 'Donor age must be between 18 and 65.' });
  }
  Object.assign(donor, {
    name: name ?? donor.name, age: age ?? donor.age, gender: gender ?? donor.gender,
    bloodGroup: bloodGroup ?? donor.bloodGroup, phone: phone ?? donor.phone,
    email: email ?? donor.email, address: address ?? donor.address,
  });
  db.activity.unshift({ ts: Date.now(), text: `Donor <b>${donor.name}</b> updated.` });
  saveDB(db);
  res.json(serialize(donor));
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  const donor = db.donors.find(d => d.id === req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found.' });
  db.donors = db.donors.filter(d => d.id !== req.params.id);
  db.activity.unshift({ ts: Date.now(), text: `Donor <b>${donor.name}</b> removed.` });
  saveDB(db);
  res.status(204).end();
});

module.exports = router;
