const express = require('express');
const { randomUUID } = require('crypto');
const { getDB, saveDB } = require('../db');
const { availableUnits, deductUnitsFEFO, todayStr } = require('../lib/blood');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDB();
  let list = [...db.requests].sort((a, b) => b.date.localeCompare(a.date));
  if (req.query.status) list = list.filter(r => r.status === req.query.status);
  res.json(list);
});

router.post('/', (req, res) => {
  const { patientName, hospital, bloodGroup, units, urgency, contact } = req.body;
  if (!patientName || !hospital || !bloodGroup || !units || !contact) {
    return res.status(400).json({ error: 'patientName, hospital, bloodGroup, units and contact are required.' });
  }
  const db = getDB();
  const request = {
    id: randomUUID(), patientName, hospital, bloodGroup, units,
    urgency: urgency || 'normal', status: 'pending', date: todayStr(), contact,
  };
  db.requests.push(request);
  db.activity.unshift({ ts: Date.now(), text: `New ${request.urgency} request from <b>${patientName}</b> for ${units} unit(s) of ${bloodGroup}.` });
  saveDB(db);
  res.status(201).json(request);
});

router.patch('/:id/approve', (req, res) => {
  const db = getDB();
  const r = db.requests.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  if (r.status !== 'pending') return res.status(409).json({ error: 'Only pending requests can be approved.' });
  r.status = 'approved';
  db.activity.unshift({ ts: Date.now(), text: `Request from <b>${r.patientName}</b> approved.` });
  saveDB(db);
  res.json(r);
});

router.patch('/:id/reject', (req, res) => {
  const db = getDB();
  const r = db.requests.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  if (!['pending', 'approved'].includes(r.status)) return res.status(409).json({ error: 'Request cannot be rejected in its current state.' });
  r.status = 'rejected';
  db.activity.unshift({ ts: Date.now(), text: `Request from <b>${r.patientName}</b> rejected/cancelled.` });
  saveDB(db);
  res.json(r);
});

router.patch('/:id/fulfill', (req, res) => {
  const db = getDB();
  const r = db.requests.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  if (r.status !== 'approved') return res.status(409).json({ error: 'Only approved requests can be fulfilled.' });

  const avail = availableUnits(db.batches, r.bloodGroup);
  if (avail < r.units) {
    return res.status(409).json({ error: `Insufficient stock: only ${avail} unit(s) of ${r.bloodGroup} available.` });
  }
  deductUnitsFEFO(db.batches, r.bloodGroup, r.units);
  r.status = 'fulfilled';
  db.activity.unshift({ ts: Date.now(), text: `Request from <b>${r.patientName}</b> fulfilled — ${r.units} unit(s) of ${r.bloodGroup} issued.` });
  saveDB(db);
  res.json(r);
});

module.exports = router;
