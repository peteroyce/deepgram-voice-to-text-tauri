// Deepgram API response types.
// Covers the shapes used by the /v1/listen (pre-recorded) and live endpoints.

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

export interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
  speaker?: number;
}

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words?: DeepgramWord[];
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

// ---------------------------------------------------------------------------
// Pre-recorded (/v1/listen) response
// ---------------------------------------------------------------------------

export interface DeepgramPreRecordedResponse {
  metadata?: {
    request_id: string;
    created: string;
    duration: number;
    channels: number;
    models?: string[];
  };
  results?: {
    channels: DeepgramChannel[];
    utterances?: Array<{
      start: number;
      end: number;
      confidence: number;
      channel: number;
      transcript: string;
      words: DeepgramWord[];
      speaker?: number;
      id: string;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Live / streaming response
// ---------------------------------------------------------------------------

export interface DeepgramLiveResponse {
  type: string;
  channel_index?: number[];
  duration?: number;
  start?: number;
  is_final: boolean;
  speech_final?: boolean;
  channel: DeepgramChannel;
  metadata?: {
    request_id?: string;
    model_info?: { name: string; version: string; arch: string };
    model_uuid?: string;
  };
}

// ---------------------------------------------------------------------------
// App-level transcript types (used by hooks)
// ---------------------------------------------------------------------------

export interface DeepgramPartialTranscript {
  id: string;
  text: string;
  isFinal: false;
}

export interface DeepgramFinalTranscript {
  id: string;
  text: string;
  isFinal: true;
}

export type DeepgramTranscript =
  | DeepgramPartialTranscript
  | DeepgramFinalTranscript;


function validate12(input) {
  return input != null;
}
