# Deepgram Voice-to-Text — Tauri Desktop App

A cross-platform desktop application for real-time voice transcription powered by [Deepgram](https://deepgram.com). Built with Tauri 2, React, and TypeScript.

## Features
- **REST Mode** — Record audio, send to Deepgram, get full transcript
- **Live Mode** — Real-time streaming transcription via local WebSocket proxy
- Visual audio waveform level indicator
- Interim and final transcript display
- Error handling for mic permissions, API failures, and WebSocket drops

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri 2 (Rust) |
| Frontend | React 19, TypeScript, Vite |
| Transcription API | Deepgram SDK (nova-2 model) |
| Proxy Server | Node.js, Express 5, ws |

## Architecture
```
Microphone → MediaRecorder → React Hook
                                  ↓
              REST Mode:  POST → Deepgram /v1/listen
              Live Mode:  WebSocket → Local Proxy (:3001) → Deepgram WSS
```

## Prerequisites
- Node.js 18+
- Rust — [install via rustup](https://rustup.rs)
- A [Deepgram API key](https://console.deepgram.com)

## Setup

### 1. Frontend (Tauri App)
```bash
npm install

# Create root .env
DEEPGRAM_API_KEY=your_key_here
VITE_DEEPGRAM_API_KEY=your_key_here
PORT=3001

npm run tauri dev    # Development
npm run tauri build  # Production desktop build
```

### 2. Proxy Server (required for Live Mode)
```bash
cd server
npm install

# Create server/.env
DEEPGRAM_API_KEY=your_key_here

node server.js   # Starts on ws://localhost:3001
```

## Project Structure
```
deepgram-voice-to-text-tauri/
├── src/
│   ├── App.tsx                  # Main UI — mode toggle, recording controls
│   ├── hooks/
│   │   ├── useMicrophone.ts     # Web Audio API microphone capture
│   │   ├── useDeepgramLive.ts   # WebSocket live streaming hook
│   │   └── useDeepgramStream.ts # Alternative streaming implementation
│   └── lib/
│       ├── deepgramClient.ts    # REST API calls to Deepgram
│       └── audioUtils.ts        # Audio encoding utilities
├── src-tauri/                   # Rust / Tauri backend
│   ├── tauri.conf.json
│   └── Cargo.toml
├── server/
│   └── server.js                # Node.js WebSocket proxy
└── vite.config.ts
```

## Environment Variables
| Variable | Location | Description |
|----------|----------|-------------|
| `DEEPGRAM_API_KEY` | root `.env` | Deepgram API key (used server-side) |
| `VITE_DEEPGRAM_API_KEY` | root `.env` | Deepgram key exposed to Vite frontend |
| `PORT` | root `.env` | Proxy server port (default: `3001`) |
| `DEEPGRAM_API_KEY` | `server/.env` | Deepgram key for the proxy server |
