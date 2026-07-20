# Online Voting System (Minimal Full-Stack Example)

This is a minimal example of an **Online Voting System** with:
- A simple **Express** backend (server/server.js) using `lowdb` (JSON file) as a lightweight database.
- A static frontend (client/) using plain HTML/JS that talks to the backend via fetch.

**NOT production-ready.** This is meant for learning and prototyping only.

## Quick start (local)

1. Open a terminal in `server/`:
   ```
   cd server
   npm install
   # (optional) set JWT_SECRET in .env or env var
   node server.js
   ```
   Server will run on `http://localhost:4000`.

2. Open `client/index.html` in a browser (or serve it with a static server).
   - You can also run a tiny static server: `npx serve client` or open the file directly.

3. Default admin user seeded:
   - email: `admin@example.com`
   - password: `adminpass`
   Admin can add candidates via `POST /api/candidates` with an Authorization Bearer token.

## Features
- Register/login (JWT used)
- List candidates
- Cast one vote per registered user
- View results (simple count)

## Important notes & next steps (for production)
- Use a real database (Postgres, MongoDB) instead of lowdb.
- Use HTTPS and secure JWT secret.
- Add email verification and stronger rate-limiting.
- Make frontend a real React/Vue app with build tools.
- Add audit logs, ballot privacy measures, and cryptographic voting techniques if needed for real elections.

Enjoy!