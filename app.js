const express = require("express");
const { verifyEvent } = require("nostr-tools");
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

// Iniciar el servidor
const port = 8000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
