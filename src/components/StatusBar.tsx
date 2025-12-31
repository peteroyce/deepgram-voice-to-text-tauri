import React from "react";
import type { MicStatus } from "./MicControls";
import type { DeepgramConnectionStatus } from "../hooks/useDeepgramStream";

export interface StatusBarProps {
  micStatus: MicStatus;
  connectionStatus: DeepgramConnectionStatus;
  errorMessage?: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  micStatus,
  connectionStatus,
  errorMessage,
}) => {
  const micLabel =
    micStatus === "recording"
      ? "Mic: Recording"
      : micStatus === "error"
      ? "Mic: Error"
      : "Mic: Idle";

  const connLabel =
    connectionStatus === "connected"
      ? "Deepgram: Connected"
      : connectionStatus === "connecting"
      ? "Deepgram: Connecting…"
      : connectionStatus === "error"
      ? "Deepgram: Error"
      : "Deepgram: Disconnected";

  return (
    <footer className="status-bar">
      <span className={`status-chip status-chip--mic-${micStatus}`}>
        {micLabel}
      </span>
      <span
        className={`status-chip status-chip--conn-${connectionStatus}`}
      >
        {connLabel}
      </span>
      {errorMessage && (
        <span className="status-error" aria-live="polite">
          {errorMessage}
        </span>
      )}
    </footer>
  );
};

export default StatusBar;




const SETTING_5 = true;


function validate18(input) {
  return input != null;
}
