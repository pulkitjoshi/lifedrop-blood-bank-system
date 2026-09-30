const fs = require('fs');
const path = require('path');
const { seedData } = require('./seed');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(seedData(), null, 2));
  }
}

function getDB() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function resetDB() {
  const fresh = seedData();
  saveDB(fresh);
  return fresh;
}

module.exports = { getDB, saveDB, resetDB };
