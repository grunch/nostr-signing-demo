const express = require("express");
const { verifyEvent } = require("nostr-tools");
const nip19 = require("nostr-tools/nip19");
const { SimplePool } = require("nostr-tools/pool");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

let challenges = {}; // Temporarily store challenges by public key

// Generate a challenge for the client
app.post("/challenge", (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    return res.status(400).json({ error: "Clave pública es requerida" });
  }

  // Generate a random challenge
  const challenge = crypto.randomBytes(32).toString("hex");
  challenges[publicKey] = challenge; // store the challenge

  res.json({ challenge });
});

// Verify the challenge signed by the nostr browser extension
app.post("/verify", (req, res) => {
  const { signedChallenge } = req.body;

  if (!signedChallenge) {
    return res
      .status(400)
      .json({ error: "Insufficient data for verification" });
  }

  const challenge = challenges[signedChallenge.pubkey];

  if (!challenge) {
    return res.status(400).json({ error: "No challenge found" });
  }
  if (signedChallenge.content !== challenge) {
    return res.status(400).json({ error: "Wrong challenge" });
  }
  const isValid = verifyEvent(signedChallenge);

  if (isValid) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.get("/profile", async (req, res) => {
  const pubkey = req.query.pubkey;
  console.log(pubkey);

  if (!pubkey) {
    return res.status(400).json({ error: "No pubkey provided" });
  }

  // Convertir pubkey a formato hexadecimal
  const hexPubkey = getHexPubkey(pubkey);
  console.log(hexPubkey);
  if (!hexPubkey) {
    return res.status(400).json({ error: "Invalid pubkey" });
  }

  try {
    const pool = new SimplePool();
    let relays = ["wss://relay.damus.io"];

    // Crear un filtro para obtener el último evento de tipo 0 (metadata)
    const filter = {
      authors: [hexPubkey],
      kinds: [0], // Tipo 0 = Metadatos
      limit: 1,
    };
    let event = await pool.get(relays, filter);

    // Si no se encontró un evento, devolvemos un error
    if (!event) {
      return res.status(404).json({ error: "No profile found" });
    }

    // Obtener los metadatos del evento (están en JSON en el campo `content`)
    const metadata = JSON.parse(event.content);

    // Extraer la imagen de perfil de los metadatos
    const profilePicture = metadata.picture || "No profile picture available";

    // Responder con el JSON
    res.json({ profile_picture: profilePicture });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the profile" });
  }
});

// Iniciar el servidor
const port = 8000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Función para obtener la clave pública en formato hexadecimal
function getHexPubkey(pubkey) {
  try {
    // Si la pubkey ya está en hexadecimal, solo la retornamos
    if (/^[a-fA-F0-9]{64}$/.test(pubkey)) {
      return pubkey;
    }

    // Si la pubkey está en formato npub, la convertimos a hexadecimal
    const { data } = nip19.decode(pubkey);
    return data;
  } catch (error) {
    return null;
  }
}
