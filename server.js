// Eigener PeerJS-Signaling-Server für "Zwei & ein Würfel"
// Vermittelt nur den Verbindungsaufbau (Signaling). Über diesen Server laufen
// KEINE Sprachdaten und KEINE Spielinhalte – die gehen direkt Gerät-zu-Gerät (P2P).

const { PeerServer } = require("peer");

const PORT = process.env.PORT || 9000;
const PATH = process.env.PEER_PATH || "/voicedate";
const KEY  = process.env.PEER_KEY  || "peerjs";

const server = PeerServer({
  port: PORT,
  path: PATH,
  key: KEY,
  // Verhindert, dass Fremde die Liste verbundener Peers abfragen können:
  allow_discovery: false,
  // Wie lange ein Peer ohne Lebenszeichen verbunden bleibt (ms):
  alive_timeout: 60000,
  expire_timeout: 5000
});

server.on("connection", (client) => {
  try { console.log("connect:", client.getId()); } catch (e) {}
});
server.on("disconnect", (client) => {
  try { console.log("disconnect:", client.getId()); } catch (e) {}
});

console.log(`PeerServer läuft auf Port ${PORT}, Pfad ${PATH}`);

// Hinweis: Auf Plattformen wie Render/Railway/Fly wird HTTPS (Port 443) vom
// Anbieter terminiert. Im Client dann: secure:true, port:443, host:<deine Domain>, path:"/voicedate".
