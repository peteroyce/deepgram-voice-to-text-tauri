import React from "react";
import type { DeepgramPartialTranscript, DeepgramFinalTranscript } from "../types/deepgram";

export interface TranscriptViewProps {
  partial?: DeepgramPartialTranscript | null;
  finals: DeepgramFinalTranscript[];
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  partial,
  finals,
}) => {
  // TODO: Improve formatting and add timestamps, speaker labels, etc.
  return (
    <section className="transcript-view">
      <h2 className="section-title">Transcript</h2>
      <div className="transcript-scroll">
        {finals.length === 0 && !partial && (
          <p className="transcript-placeholder">
            Start recording to see your transcript here.
          </p>
        )}
        {finals.map((t) => (
          <p key={t.id} className="transcript-line transcript-line--final">
            {t.text}
          </p>
        ))}
        {partial && partial.text && (
          <p className="transcript-line transcript-line--partial">
            {partial.text}
          </p>
        )}
      </div>
    </section>
  );
};

export default TranscriptView;


