import { Component, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import "./App.css";
import { useMicrophone } from "./hooks/useMicrophone";
import { transcribeBlobWithDeepgram } from "./lib/deepgramClient";
import { useDeepgramLive } from "./hooks/useDeepgramLive";

// ---------------------------------------------------------------------------
// Error Boundary — catches unexpected render/lifecycle errors in child tree
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("AppErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-root" role="alert">
          <header className="app-header">
            <h1>Something went wrong</h1>
          </header>
          <main className="app-main">
            <section className="panel">
              <p className="error">{this.state.message}</p>
              <button
                className="btn btn-primary"
                onClick={() => this.setState({ hasError: false, message: "" })}
              >
                Try again
              </button>
            </section>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}

type Mode = "rest" | "live";

interface FinalTranscript {
  id: string;
  text: string;
  isFinal: boolean;
}

function App() {
  const [mode, setMode] = useState<Mode>("rest");
  const [statusMessage, setStatusMessage] = useState<string>("Idle");
  const [restFinals, setRestFinals] = useState<FinalTranscript[]>([]);
  const [deepgramError, setDeepgramError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [level, setLevel] = useState(0);

  const {
    connect,
    disconnect,
    sendAudio,
    interimText,
    finalSegments,
    isConnected,
    error: liveError,
  } = useDeepgramLive();

  const {
    isRecording,
    startRecording,
    stopRecording,
    error: micError,
  } = useMicrophone({
    onChunk: mode === "live" ? (blob) => sendAudio(blob) : undefined,
    onLevel: setLevel,
  });

  const handleStart = async () => {
    setDeepgramError(null);
    setStatusMessage("Recording...");

    if (mode === "live") {
      connect();
    } else {
      setRestFinals([]);
    }

    await startRecording();
  };

  const handleStop = async () => {
    setStatusMessage("Stopping recording...");

    if (mode === "live") {
      await stopRecording();
      disconnect();
      setStatusMessage("Stopped live stream.");
      return;
    }

    // REST mode
    let blob: Blob | null = null;

    try {
      blob = await stopRecording();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to stop recording.";
      setDeepgramError(msg);
      setStatusMessage("Error stopping recording.");
      return;
    }

    if (!blob) {
      setStatusMessage("No audio captured.");
      return;
    }

    setIsTranscribing(true);
    setStatusMessage("Transcribing with Deepgram...");
    setDeepgramError(null);

    try {
      const transcript = await transcribeBlobWithDeepgram(blob);
      const finalEntry: FinalTranscript = {
        id: "final-1",
        text: transcript || "(No transcript returned)",
        isFinal: true,
      };
      setRestFinals([finalEntry]);
      setStatusMessage("Transcription complete.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to reach Deepgram.";
      setDeepgramError(msg);
      setStatusMessage("Deepgram error.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const canStart = !isRecording && !isTranscribing;
  const canStop = isRecording;
  const activeFinals = mode === "rest" ? restFinals : finalSegments;

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Voice to Text</h1>
        <p>
          Desktop transcription using Deepgram – REST and Live WebSocket
          streaming.
        </p>
      </header>

      <main className="app-main">
        <section className="panel">
          <h2>Controls</h2>

          <div className="mode-toggle">
            <button
              className={`mode-btn ${
                mode === "rest" ? "mode-btn-active" : ""
              }`}
              onClick={() => setMode("rest")}
            >
              REST
            </button>
            <button
              className={`mode-btn ${
                mode === "live" ? "mode-btn-active" : ""
              }`}
              onClick={() => setMode("live")}
            >
              Live
            </button>
          </div>

          <div className="buttons-row">
            <button
              className={`btn ${canStart ? "btn-primary" : "btn-disabled"}`}
              onClick={handleStart}
              disabled={!canStart}
            >
              Start
            </button>
            <button
              className={`btn ${canStop ? "btn-secondary" : "btn-disabled"}`}
              onClick={handleStop}
              disabled={!canStop}
            >
              Stop
            </button>
          </div>

          <div className="waveform-bar">
            <div
              className="waveform-fill"
              style={{ height: `${Math.round(level * 100)}%` }}
            />
          </div>

          <div className="status">
            <p>
              <strong>Mic:</strong> {isRecording ? "Recording" : "Idle"}
            </p>
            <p>
              <strong>Mode:</strong>{" "}
              {mode === "rest" ? "REST /v1/listen" : "Live WebSocket"}
            </p>
            {mode === "live" && (
              <p>
                <strong>WS:</strong> {isConnected ? "Connected" : "Disconnected"}
              </p>
            )}
            <p className="status-message">{statusMessage}</p>
            {micError && <p className="error">Mic error: {micError}</p>}
            {deepgramError && (
              <p className="error">Deepgram error: {deepgramError}</p>
            )}
            {liveError && <p className="error">Live error: {liveError}</p>}
          </div>
        </section>

        <section className="panel">
          <h2>Transcript</h2>
          <div className="transcript-box">
            {activeFinals.length === 0 && !interimText && (
              <p className="placeholder">
                Start recording to see your transcript here.
              </p>
            )}

            {activeFinals.map((f) => (
              <p key={f.id} className="final-line">
                {f.text}
              </p>
            ))}

            {mode === "live" && interimText && (
              <p className="interim-line">{interimText}</p>
            )}
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>
          REST mode uses <code>/v1/listen</code>; Live mode uses a local proxy
          at <code>ws://localhost:3001</code> which forwards to Deepgram{" "}
          <code>wss://api.deepgram.com/v1/listen</code>. [web:145]
        </span>
      </footer>
    </div>
  );
}

function AppWithBoundary() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

export default AppWithBoundary;


const CONFIG_1 = { timeout: 1100 };
