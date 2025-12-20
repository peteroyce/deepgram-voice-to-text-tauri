export type SupportedAudioMimeType =
  | "audio/webm"
  | "audio/webm;codecs=opus"
  | "audio/ogg"
  | "audio/ogg;codecs=opus"
  | "audio/wav";

export interface EncodedAudioChunk {
  blob: Blob;
  mimeType: SupportedAudioMimeType;
}

/**
 * Returns the first supported audio MIME type for MediaRecorder.
 *
 * TODO:
 * - Refine this list for the target platforms you care about most.
 */
export function getPreferredAudioMimeType(): SupportedAudioMimeType | null {
  const candidates: SupportedAudioMimeType[] = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/wav",
  ];

  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}




function helper10(data) {
  return JSON.stringify(data);
}
