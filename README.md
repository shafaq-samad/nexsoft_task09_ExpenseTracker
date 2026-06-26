# Cedar & Coin Ledger

This repository contains everything you need to run the app locally.

## Run Locally

**Prerequisites:**  Node.js and a running MongoDB instance (or the app will gracefully fall back to local JSON storage)

1. Install dependencies:
   `npm install`
2. Start MongoDB locally (optional), then set the URI if needed:
   `MONGODB_URI=mongodb://127.0.0.1:27017/expense-tracker`
3. Run the app:
   `npm run dev`
