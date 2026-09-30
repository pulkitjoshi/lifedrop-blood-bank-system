const { randomUUID } = require('crypto');
const { SHELF_LIFE_DAYS } = require('./constants');

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seedData() {
  const donors = [
    { id: randomUUID(), name: 'Aarav Sharma', age: 28, gender: 'Male', bloodGroup: 'O+', phone: '9876500001', email: 'aarav@example.com', address: 'Pune', lastDonationDate: daysAgoStr(20), totalDonations: 4 },
    { id: randomUUID(), name: 'Priya Nair', age: 34, gender: 'Female', bloodGroup: 'A+', phone: '9876500002', email: 'priya@example.com', address: 'Mumbai', lastDonationDate: daysAgoStr(120), totalDonations: 6 },
    { id: randomUUID(), name: 'Rohan Mehta', age: 41, gender: 'Male', bloodGroup: 'B-', phone: '9876500003', email: 'rohan@example.com', address: 'Delhi', lastDonationDate: daysAgoStr(200), totalDonations: 2 },
    { id: randomUUID(), name: 'Sneha Iyer', age: 25, gender: 'Female', bloodGroup: 'O-', phone: '9876500004', email: 'sneha@example.com', address: 'Bengaluru', lastDonationDate: null, totalDonations: 0 },
    { id: randomUUID(), name: 'Karan Verma', age: 30, gender: 'Male', bloodGroup: 'AB+', phone: '9876500005', email: 'karan@example.com', address: 'Chennai', lastDonationDate: daysAgoStr(45), totalDonations: 3 },
  ];

  const donations = [];
  const batches = [];

  function makeDonation(donor, units, ageDays, center) {
    const date = daysAgoStr(ageDays);
    const expiryDate = addDaysStr(date, SHELF_LIFE_DAYS);
    const donationId = randomUUID();
    donations.push({ id: donationId, donorId: donor.id, donorName: donor.name, bloodGroup: donor.bloodGroup, units, date, center });
    batches.push({ id: randomUUID(), bloodGroup: donor.bloodGroup, units, collectedDate: date, expiryDate, donationId });
  }

  makeDonation(donors[0], 1, 20, 'City General Hospital');
  makeDonation(donors[1], 1, 120, 'City General Hospital');
  makeDonation(donors[2], 1, 200, 'Red Cross Center');
  makeDonation(donors[4], 1, 45, 'Red Cross Center');
  makeDonation(donors[0], 1, 3, 'City General Hospital');
  makeDonation(donors[1], 1, 5, 'City General Hospital');
  makeDonation(donors[4], 1, 40, 'Red Cross Center');

  const requests = [
    { id: randomUUID(), patientName: 'Vikram Rao', hospital: 'Sunrise Hospital', bloodGroup: 'O+', units: 2, urgency: 'high', status: 'pending', date: daysAgoStr(1), contact: '9123456780' },
    { id: randomUUID(), patientName: 'Anita Joshi', hospital: 'City General Hospital', bloodGroup: 'A+', units: 1, urgency: 'critical', status: 'pending', date: daysAgoStr(0), contact: '9123456781' },
    { id: randomUUID(), patientName: 'Farhan Ali', hospital: 'Red Cross Center', bloodGroup: 'B-', units: 1, urgency: 'normal', status: 'approved', date: daysAgoStr(4), contact: '9123456782' },
  ];

  const activity = [
    { ts: Date.now(), text: 'System initialized with demo data.' },
  ];

  return { donors, batches, donations, requests, activity };
}

module.exports = { seedData };
