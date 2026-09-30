# LifeDrop — Blood Bank Management System

[![GitHub Repo](https://img.shields.io/badge/GitHub-lifedrop--blood--bank--system-blue?logo=github)](https://github.com/pulkitjoshi/lifedrop-blood-bank-system)

A full-stack blood bank management system: **Angular** frontend + **Node.js/Express** REST API backend, with a JSON-file data store (no database server required).

## Features

- **Dashboard** — live stats, inventory-by-blood-group chart, low-stock/expiry/critical-request alerts, recent activity feed
- **Donors** — register/edit/delete donors, search & filter by blood group and eligibility (90-day minimum gap between donations, ages 18–65)
- **Inventory** — per-blood-group stock levels, batch tracking with 42-day expiry (fresh / expiring soon / expired), record new donations
- **Requests** — hospital/patient blood requests with urgency levels; pending → approved → fulfilled workflow that deducts stock First-Expiry-First-Out, or reject/cancel
- **Donation Log** — full history of every donation recorded

## Project layout

```
bbsystem/
├── server/     Node.js + Express REST API (JSON file storage in server/data/db.json)
└── client/     Angular 17 standalone-component frontend
```

## Prerequisites

- Node.js 18+ and npm

## 1. Run the backend

```bash
cd server
npm install
npm start
```

The API starts on **http://localhost:3000** and seeds demo data (donors, batches, requests) into `server/data/db.json` on first run. Delete that file (or `POST /api/reset`) to reseed.

## 2. Run the frontend

In a second terminal:

```bash
cd client
npm install
npm start
```

This runs `ng serve` on **http://localhost:4200**, proxying `/api/*` requests to the backend (see `client/proxy.conf.json`). Open http://localhost:4200 in a browser.

## API overview

| Method | Endpoint                        | Description                          |
|--------|----------------------------------|---------------------------------------|
| GET    | /api/dashboard                  | Stats, inventory, alerts, activity    |
| GET/POST/PUT/DELETE | /api/donors        | Donor CRUD                            |
| GET    | /api/inventory                  | Units available per blood group       |
| GET    | /api/inventory/batches          | Batch list (optional `?bloodGroup=`)  |
| DELETE | /api/inventory/batches/:id      | Remove an expired/empty batch         |
| GET/POST | /api/donations                 | Donation log / record a donation      |
| GET/POST | /api/requests                  | Request list / submit a new request   |
| PATCH  | /api/requests/:id/approve       | Approve a pending request             |
| PATCH  | /api/requests/:id/reject        | Reject/cancel a request               |
| PATCH  | /api/requests/:id/fulfill       | Fulfill an approved request (deducts stock) |
| POST   | /api/reset                      | Reset to fresh demo data              |

## Notes

- Blood units expire 42 days after collection; donors must wait 90 days between donations.
- Request fulfillment draws only from the exact matching blood group using First-Expiry-First-Out batch selection — it does not model cross-group compatibility (e.g. O- universal donor).
