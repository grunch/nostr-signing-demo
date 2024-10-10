async function login() {
  // Verify if the Nostr extension is installed
  if (typeof window.nostr === "undefined") {
    alert("Please install a Nostr extension like Alby to log in.");
    return;
  }

  try {
    // Obtain the extension's public key
    const publicKey = await window.nostr.getPublicKey();
    console.log("Public key:", publicKey);

    // Request a server challenge
    const response = await fetch("/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey }),
    });

    const { challenge } = await response.json();
    console.log("Challenge:", challenge);

    // Asking the extension to sign the challenge
    const signedChallenge = await window.nostr.signEvent({
      pubkey: publicKey,
      kind: 1,
      tags: [],
      content: challenge,
      created_at: Math.floor(Date.now() / 1000),
    });

    // Send the signed challenge to the server for verification
    const verifyResponse = await fetch("/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedChallenge }),
    });

    const result = await verifyResponse.json();
    if (result.success) {
      alert("Successfully authenticated");
    } else {
      alert("Authentication failure");
    }
  } catch (error) {
    console.error("Error during authentication process:", error);
    alert("Error during authentication. Check your Nostr extension.");
  }
}
