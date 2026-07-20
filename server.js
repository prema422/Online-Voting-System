// server.js
// Minimal Express backend using lowdb (JSON file) as simple database.
// NOT production-ready. See README for notes.

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DB_DIR = path.join(__dirname, "db.json");
const adapter = new JSONFile(DB_DIR);
const db = new Low(adapter);

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_strong_secret";
const SALT_ROUNDS = 10;

async function initDB() {
  await db.read();
  db.data ||= { users: [], candidates: [], votes: [] };
  // seed an admin user if not present
  if (!db.data.users.find(u => u.role === "admin")) {
    const hashed = await bcrypt.hash("adminpass", SALT_ROUNDS);
    db.data.users.push({ id: nanoid(), name: "admin", email: "admin@example.com", password: hashed, role: "admin" });
  }
  if (db.data.candidates.length === 0) {
    db.data.candidates.push({ id: nanoid(), name: "Alice" });
    db.data.candidates.push({ id: nanoid(), name: "Bob" });
  }
  await db.write();
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing token" });
  const token = auth.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/", (req, res) => res.send("Online Voting System API"));

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  await db.read();
  const exists = db.data.users.find(u => u.email === email);
  if (exists) return res.status(400).json({ error: "Email already registered" });
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = { id: nanoid(), name, email, password: hashed, role: "voter" };
  db.data.users.push(user);
  await db.write();
  res.json({ success: true });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  await db.read();
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/candidates", async (req, res) => {
  await db.read();
  res.json(db.data.candidates);
});

app.post("/api/candidates", authMiddleware, async (req, res) => {
  // only admin can add candidates
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });
  await db.read();
  const candidate = { id: nanoid(), name };
  db.data.candidates.push(candidate);
  await db.write();
  res.json(candidate);
});

app.post("/api/vote", authMiddleware, async (req, res) => {
  const { candidateId } = req.body;
  if (!candidateId) return res.status(400).json({ error: "Missing candidateId" });
  await db.read();
  // prevent double voting by user id
  if (db.data.votes.find(v => v.voterId === req.user.id)) {
    return res.status(400).json({ error: "Already voted" });
  }
  const candidate = db.data.candidates.find(c => c.id === candidateId);
  if (!candidate) return res.status(400).json({ error: "Candidate not found" });
  db.data.votes.push({ id: nanoid(), voterId: req.user.id, candidateId, timestamp: Date.now() });
  await db.write();
  res.json({ success: true });
});

app.get("/api/results", async (req, res) => {
  await db.read();
  const results = db.data.candidates.map(c => {
    const count = db.data.votes.filter(v => v.candidateId === c.id).length;
    return { candidate: c, votes: count };
  });
  res.json(results);
});

const PORT = process.env.PORT || 4000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});