const { BLOOD_GROUPS, ELIGIBILITY_GAP_DAYS, EXPIRING_SOON_DAYS } = require('../constants');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + 'T00:00:00');
  const b = new Date(dateStrB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function isEligible(donor) {
  if (!donor.lastDonationDate) return true;
  return daysBetween(donor.lastDonationDate, todayStr()) >= ELIGIBILITY_GAP_DAYS;
}

function eligibleInDays(donor) {
  if (!donor.lastDonationDate) return 0;
  const d = daysBetween(donor.lastDonationDate, todayStr());
  return Math.max(0, ELIGIBILITY_GAP_DAYS - d);
}

function batchStatus(batch) {
  const daysLeft = daysBetween(todayStr(), batch.expiryDate);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= EXPIRING_SOON_DAYS) return 'expiring';
  return 'fresh';
}

function computeInventory(batches) {
  const inv = {};
  BLOOD_GROUPS.forEach(g => { inv[g] = 0; });
  batches.forEach(b => {
    if (batchStatus(b) !== 'expired' && b.units > 0) inv[b.bloodGroup] += b.units;
  });
  return inv;
}

function availableUnits(batches, group) {
  return batches
    .filter(b => b.bloodGroup === group && batchStatus(b) !== 'expired')
    .reduce((sum, b) => sum + b.units, 0);
}

/** Mutates batches in place, deducting units First-Expiry-First-Out. Returns true if fully satisfied. */
function deductUnitsFEFO(batches, group, unitsNeeded) {
  const candidates = batches
    .filter(b => b.bloodGroup === group && batchStatus(b) !== 'expired' && b.units > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  let remaining = unitsNeeded;
  for (const b of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(b.units, remaining);
    b.units -= take;
    remaining -= take;
  }
  return remaining === 0;
}

module.exports = {
  todayStr, daysBetween, isEligible, eligibleInDays, batchStatus,
  computeInventory, availableUnits, deductUnitsFEFO,
};
