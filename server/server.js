// server/server.js
require("dotenv").config();
const express = require("express");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3001;
const DG_KEY = process.env.DEEPGRAM_API_KEY;

if (!DG_KEY) {
  console.error("Missing DEEPGRAM_API_KEY in .env");
  process.exit(1);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});

// WebSocket server your Tauri app connects to
const wss = new WebSocket.Server({ server });

wss.on("connection", (clientSocket) => {
  console.log("Client connected to proxy");

  // Open WebSocket directly to Deepgram live endpoint [web:13][web:145]
  const dgUrl =
    "wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true&punctuate=true";

  const dgSocket = new WebSocket(dgUrl, {
    headers: {
      // Auth with API key in header [web:145]
      Authorization: `Token ${DG_KEY}`,
    },
  });

  dgSocket.on("open", () => {
    console.log("Deepgram live connection opened");
  });

  dgSocket.on("message", (data) => {
    // Forward Deepgram messages to client unchanged
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(data);
    }
  });

  dgSocket.on("error", (err) => {
    console.error("Deepgram WS error", err);
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(1011, "Deepgram error");
    }
  });

  dgSocket.on("close", (code, reason) => {
    console.log("Deepgram WS close", code, reason.toString());
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(1000, "Deepgram closed");
    }
  });

  clientSocket.on("message", (msg) => {
    console.log(
      "Proxy received chunk",
      msg.length || msg.byteLength || msg.size || 0
    );
    // Forward audio chunks from client to Deepgram
    if (dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.send(msg);
    }
  });

  clientSocket.on("close", () => {
    console.log("Client disconnected from proxy");
    if (dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.close(1000, "Client closed");
    }
  });

  clientSocket.on("error", (err) => {
    console.error("Client WS error", err);
    if (dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.close(1011, "Client error");
    }
  });
});
