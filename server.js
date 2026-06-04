// Server für "Zwei & ein Würfel":
//  1) PeerJS-Signaling (Verbindungsaufbau)
//  2) Raum-Lobby (Liste offener Räume: nur NAME, ob PIN gesetzt, Spielerzahl)
//
// WICHTIG: Über diesen Server laufen KEINE Sprachdaten und KEINE Spielinhalte.
// Es werden KEINE PINs gespeichert – die PIN prüfen die Geräte direkt untereinander.

const express = require("express");
const { ExpressPeerServer } = require("peer");

const PORT      = process.env.PORT      || 9000;
const PEER_PATH = process.env.PEER_PATH || "/voicedate";
const PEER_KEY  = process.env.PEER_KEY  || "peerjs";
const ROOM_TTL  = 35000; // Raum verschwindet, wenn 35s kein Lebenszeichen kommt

const app = express();
app.use(express.json());

// CORS – die Web-App läuft auf einer anderen Domain (z. B. Netlify)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ---- Raum-Lobby (nur Anzeige-Infos) ----
const rooms = new Map(); // code -> {code,name,hasPin,players,ts}
const cc = (x) => String(x || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12); // Code säubern
function clean() {
  const now = Date.now();
  for (const [k, v] of rooms) if (now - v.ts > ROOM_TTL) rooms.delete(k);
}
setInterval(clean, 15000);

app.get("/api/rooms", (req, res) => {
  clean();
  const list = [...rooms.values()]
    .sort((a, b) => b.ts - a.ts)
    .map(r => ({ code: r.code, name: r.name, hasPin: r.hasPin, players: r.players }));
  res.json(list);
});

app.post("/api/rooms", (req, res) => {
  const b = req.body || {};
  const code = cc(b.code);
  if (!code) return res.status(400).json({ error: "code fehlt/ungültig" });
  const name = String(b.name || ("Raum " + code)).replace(/[<>]/g, "").slice(0, 40);
  rooms.set(code, {
    code,
    name,
    hasPin: !!b.hasPin,
    players: Math.max(1, Math.min(2, (b.players | 0) || 1)),
    ts: Date.now()
  });
  res.json({ ok: true });
});

app.post("/api/heartbeat", (req, res) => {
  const b = req.body || {};
  const r = rooms.get(cc(b.code));
  if (r) { r.ts = Date.now(); if (b.players) r.players = Math.max(1, Math.min(2, b.players | 0)); }
  res.json({ ok: true });
});

// Schließen: per JSON-Body ODER per Query (?code=...) – für navigator.sendBeacon
app.post("/api/close", (req, res) => {
  const code = cc((req.body && req.body.code) || req.query.code);
  if (code) rooms.delete(code);
  res.json({ ok: true });
});

app.get("/", (req, res) => res.send("Zwei & ein Würfel – Server läuft."));

const server = app.listen(PORT, () => console.log(`Server auf Port ${PORT}, Peer-Pfad ${PEER_PATH}`));

// ---- PeerJS-Signaling unter PEER_PATH ----
const peerServer = ExpressPeerServer(server, { path: "/", key: PEER_KEY, allow_discovery: false });
app.use(PEER_PATH, peerServer);

peerServer.on("connection", (c) => { try { console.log("peer connect:", c.getId()); } catch (e) {} });
