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

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter — max connections per IP within a window
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 10;   // connections
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000; // 1 minute

/** @type {Map<string, { count: number; resetAt: number }>} */
const ipConnections = new Map();

/**
 * Returns true if the IP is over the rate limit.
 * @param {string} ip
 */
function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipConnections.get(ip);

  if (!entry || now > entry.resetAt) {
    ipConnections.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});

// ---------------------------------------------------------------------------
// WebSocket proxy to Deepgram
// ---------------------------------------------------------------------------

const wss = new WebSocket.Server({ server });

wss.on("connection", (clientSocket, request) => {
  const ip =
    (request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown")
      .toString()
      .split(",")[0]
      .trim();

  if (isRateLimited(ip)) {
    console.warn(`Rate limit exceeded for ${ip} — closing connection`);
    clientSocket.close(1008, "Rate limit exceeded");
    return;
  }

  console.log(`Client connected to proxy [${ip}]`);

  const dgUrl =
    "wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true&punctuate=true";

  const dgSocket = new WebSocket(dgUrl, {
    headers: {
      Authorization: `Token ${DG_KEY}`,
    },
  });

  dgSocket.on("open", () => {
    console.log("Deepgram live connection opened");
  });

  dgSocket.on("message", (data) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(data);
    }
  });

  dgSocket.on("error", (err) => {
    console.error("Deepgram WS error", err.message);
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
    const size = (msg && (msg.length || msg.byteLength || msg.size)) || 0;
    console.log("Proxy received chunk", size);
    if (dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.send(msg);
    }
  });

  clientSocket.on("close", () => {
    console.log(`Client disconnected from proxy [${ip}]`);
    if (dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.close(1000, "Client closed");
    }
  });

  clientSocket.on("error", (err) => {
    console.error("Client WS error", err.message);
    if (dgSocket.readyState === WebSocket.OPEN) {
      dgSocket.close(1011, "Client error");
    }
  });
});

// ---------------------------------------------------------------------------
// Graceful shutdown — close all connections cleanly on SIGTERM / SIGINT
// ---------------------------------------------------------------------------

function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  // Close the HTTP + WS server (stop accepting new connections)
  server.close(() => {
    console.log("HTTP server closed.");
  });

  // Close all active WebSocket clients
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.close(1001, "Server shutting down");
    }
  }

  // Force-exit after 5 s if connections hang
  const forceExit = setTimeout(() => {
    console.error("Forced exit after timeout.");
    process.exit(1);
  }, 5_000);

  // Allow the timeout to be garbage-collected if not needed
  if (forceExit.unref) forceExit.unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
