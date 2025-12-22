import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { DeepgramPartialTranscript, DeepgramFinalTranscript } from "../types/deepgram";

export type DeepgramConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface UseDeepgramStreamResult {
  status: DeepgramConnectionStatus;
  error: string | null;
  partial: DeepgramPartialTranscript | null;
  finals: DeepgramFinalTranscript[];
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudioChunk: (chunk: Blob) => void;
}

export function useDeepgramStream(): UseDeepgramStreamResult {
  const [status, setStatus] = useState<DeepgramConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState<DeepgramPartialTranscript | null>(null);
  const [finals, setFinals] = useState<DeepgramFinalTranscript[]>([]);
  const connectionRef = useRef<any>(null);
  const nextIdRef = useRef<number>(1);

  const resetTranscripts = useCallback(() => {
    setPartial(null);
    setFinals([]);
  }, []);

  const connect = useCallback(async () => {
    if (connectionRef.current) {
      return;
    }

    const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined;
    if (!apiKey) {
      setError("VITE_DEEPGRAM_API_KEY is not set.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("connecting");
    resetTranscripts();

    try {
      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model: "nova-2",
        smart_format: true,
        language: "en",
      });

      connectionRef.current = connection;

      connection.on(LiveTranscriptionEvents.Open, () => {
        setStatus("connected");
      });

      connection.on(LiveTranscriptionEvents.Error, (err: any) => {
        setError(err?.message || "Deepgram connection error.");
        setStatus("error");
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        connectionRef.current = null;
        if (status !== "error") {
          setStatus("disconnected");
        }
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const channel = data.channel?.alternatives?.[0];
        const transcript: string = channel?.transcript ?? "";
        const isFinal: boolean = !!data.is_final;

        if (!transcript) {
          if (!isFinal) {
            setPartial(null);
          }
          return;
        }

        if (isFinal) {
          const id = `final-${nextIdRef.current++}`;
          const finalEntry: DeepgramFinalTranscript = {
            id,
            text: transcript,
            isFinal: true,
          };
          setFinals((prev) => [...prev, finalEntry]);
          setPartial(null);
        } else {
          const id = `partial-${nextIdRef.current}`;
          const partialEntry: DeepgramPartialTranscript = {
            id,
            text: transcript,
            isFinal: false,
          };
          setPartial(partialEntry);
        }
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect to Deepgram.";
      setError(message);
      setStatus("error");
    }
  }, [resetTranscripts, status]);

  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      try {
        connectionRef.current.finish();
      } catch {
        // ignore
      }
      connectionRef.current = null;
    }
    setStatus("disconnected");
    resetTranscripts();
  }, [resetTranscripts]);

  const sendAudioChunk = useCallback(async (chunk: Blob) => {
    const connection = connectionRef.current;
    if (!connection) {
      return;
    }

    try {
      const buffer = await chunk.arrayBuffer();
      connection.send(buffer);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send audio chunk.";
      setError(message);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        try {
          connectionRef.current.finish();
        } catch {
          // ignore
        }
        connectionRef.current = null;
      }
    };
  }, []);

  return {
    status,
    error,
    partial,
    finals,
    connect,
    disconnect,
    sendAudioChunk,
  };
}
