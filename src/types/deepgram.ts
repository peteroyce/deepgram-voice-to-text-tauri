// Basic Deepgram live transcript types for app-level use.
// These are simplified and can be refined against Deepgram's full schema later.

export interface DeepgramPartialTranscript {
  id: string;
  text: string;
  isFinal: false;
  // TODO: Add timestamps, confidence, and speaker metadata.
}

export interface DeepgramFinalTranscript {
  id: string;
  text: string;
  isFinal: true;
  // TODO: Add timestamps, confidence, and speaker metadata.
}

export type DeepgramTranscript = DeepgramPartialTranscript | DeepgramFinalTranscript;


