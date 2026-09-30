const express = require('express');
const cors = require('cors');
const { resetDB } = require('./db');

const donorsRouter = require('./routes/donors');
const inventoryRouter = require('./routes/inventory');
const donationsRouter = require('./routes/donations');
const requestsRouter = require('./routes/requests');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/donors', donorsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/donations', donationsRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/dashboard', dashboardRouter);

app.post('/api/reset', (req, res) => {
  const fresh = resetDB();
  res.json({ message: 'Demo data reset.', donors: fresh.donors.length });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`LifeDrop API listening on http://localhost:${PORT}`);
});
