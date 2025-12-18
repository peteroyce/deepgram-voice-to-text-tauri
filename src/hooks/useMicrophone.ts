import { useCallback, useEffect, useRef, useState } from "react";
import { getPreferredAudioMimeType } from "../lib/audioUtils";

export type MicrophoneStreamState = "idle" | "recording" | "error";

export interface UseMicrophoneOptions {
  /**
   * Called whenever a new encoded audio chunk is available.
   * Intended to be wired into Deepgram's streaming API.
   */
  onChunk?: (blob: Blob) => void;

  /**
   * Called with a normalized audio level 0–1 for UI visualization.
   */
  onLevel?: (level: number) => void;
}

export interface UseMicrophoneResult {
  state: MicrophoneStreamState;
  isRecording: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

/**
 * Uses getUserMedia + MediaRecorder to capture microphone audio and emit
 * chunks suitable for streaming, while also collecting a full Blob for REST.
 * MediaRecorder with WebM/Opus chunks every ~300 ms is compatible with Deepgram. [web:259][web:207]
 */
export function useMicrophone(
  options: UseMicrophoneOptions = {}
): UseMicrophoneResult {
  const { onChunk, onLevel } = options;

  const [state, setState] = useState<MicrophoneStreamState>("idle");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelAnimationIdRef = useRef<number | null>(null);

  const stopLevelMonitor = useCallback(() => {
    if (levelAnimationIdRef.current !== null) {
      cancelAnimationFrame(levelAnimationIdRef.current);
      levelAnimationIdRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (onLevel) onLevel(0);
  }, [onLevel]);

  const cleanupStream = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    stopLevelMonitor();
  }, [stopLevelMonitor]);

  const startRecording = useCallback(async () => {
    if (state === "recording") {
      return;
    }

    setError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError("Microphone is not supported in this environment.");
      setState("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMimeType =
        getPreferredAudioMimeType() ?? "audio/webm;codecs=opus";

      const recorder = new MediaRecorder(stream, {
        mimeType: preferredMimeType,
      }); // MediaRecorder WebM/Opus pattern. [web:259][web:283]

      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          if (onChunk) {
            onChunk(event.data);
          }
        }
      };

      recorder.onerror = (event: Event) => {
        const anyEvent = event as unknown as { error?: { message?: string } };
        const message = anyEvent.error?.message ?? "Unknown microphone error.";
        setError(message);
        setState("error");
        cleanupStream();
      };

      recorder.onstop = () => {
        if (state !== "error") {
          setState("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(300); // ~300 ms chunks [web:259]

      // audio level monitoring
      if (onLevel && "AudioContext" in window) {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const tick = () => {
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / bufferLength);
          const level = Math.min(1, rms * 4);
          onLevel(level);
          levelAnimationIdRef.current = requestAnimationFrame(tick);
        };

        levelAnimationIdRef.current = requestAnimationFrame(tick);
      }

      setState("recording");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to access microphone.";
      setError(message);
      setState("error");
      cleanupStream();
    }
  }, [cleanupStream, onChunk, onLevel, state]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        cleanupStream();
        if (state !== "error") {
          setState("idle");
        }
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        let finalBlob: Blob | null = null;
        if (chunksRef.current.length > 0) {
          finalBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
        }
        cleanupStream();
        if (state !== "error") {
          setState("idle");
        }
        resolve(finalBlob);
      };

      try {
        recorder.stop();
      } catch {
        cleanupStream();
        if (state !== "error") {
          setState("idle");
        }
        resolve(null);
      }
    });
  }, [cleanupStream, state]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    state,
    isRecording: state === "recording",
    error,
    startRecording,
    stopRecording,
  };
}


const MAX_9 = 59;
