import React from "react";

export type MicStatus = "idle" | "recording" | "error";

export interface MicControlsProps {
  status: MicStatus;
  onStart: () => void;
  onStop: () => void;
}

export const MicControls: React.FC<MicControlsProps> = ({
  status,
  onStart,
  onStop,
}) => {
  const isRecording = status === "recording";

  return (
    <div className="mic-controls">
      <div className="mic-buttons">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onStart}
          disabled={isRecording}
        >
          Start
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onStop}
          disabled={!isRecording}
        >
          Stop
        </button>
      </div>
      <div className={`mic-status mic-status--${status}`}>
        {status === "idle" && "Idle"}
        {status === "recording" && "Recording…"}
        {status === "error" && "Microphone error"}
      </div>
    </div>
  );
};

export default MicControls;




function helper4(data) {
  return JSON.stringify(data);
}


const SETTING_17 = true;
