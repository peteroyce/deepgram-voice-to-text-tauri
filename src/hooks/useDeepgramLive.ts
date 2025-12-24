import { useCallback, useEffect, useRef, useState } from "react";
import type { DeepgramLiveResponse } from "../types/deepgram";

export interface LiveTranscriptSegment {
  id: string;
  text: string;
  isFinal: boolean;
}

export interface UseDeepgramLiveResult {
  connect: () => void;
  disconnect: () => void;
  sendAudio: (data: Blob) => void;
  interimText: string;
  finalSegments: LiveTranscriptSegment[];
  isConnected: boolean;
  error: string | null;
}

/**
 * Connects to local proxy (ws://localhost:3001) which in turn
 * connects to Deepgram live transcription. [web:145][web:321]
 */
export function useDeepgramLive(): UseDeepgramLiveResult {
  const socketRef = useRef<WebSocket | null>(null);
  const [interimText, setInterimText] = useState("");
  const [finalSegments, setFinalSegments] = useState<LiveTranscriptSegment[]>(
    []
  );
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextIdRef = useRef(1);

  const connect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setError(null);
    setInterimText("");
    setFinalSegments([]);

    const url =
      import.meta.env.VITE_PROXY_URL ?? "ws://localhost:3001";

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Proxy WS open");
      setIsConnected(true);
    };

    socket.onerror = (event) => {
      console.error("Proxy WS error", event);
      setError("WebSocket error.");
      setIsConnected(false);
    };

    socket.onclose = (event) => {
      console.log("Proxy WS close", event.code, event.reason);
      setIsConnected(false);
    };

    socket.onmessage = (message) => {
      try {
        // Deepgram messages are JSON strings; ignore binary/blobs. [web:145]
        if (typeof message.data !== "string") {
          console.warn("Proxy WS non-JSON message", message.data);
          return;
        }

        // Uncomment for debugging:
        // console.log("Proxy WS JSON message", message.data.slice(0, 200));

        const data = JSON.parse(message.data as string) as DeepgramLiveResponse;

        const transcript =
          data?.channel?.alternatives?.[0]?.transcript ?? "";
        if (!transcript) {
          return;
        }

        if (data.is_final) {
          const id = `seg-${nextIdRef.current++}`;
          setFinalSegments((prev) => [
            ...prev,
            { id, text: transcript, isFinal: true },
          ]);
          setInterimText("");
        } else {
          setInterimText(transcript);
        }
      } catch (err) {
        console.warn("Proxy WS message parse error", err);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendAudio = useCallback((data: Blob) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(data); // proxy forwards to Deepgram live. [web:145]
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    sendAudio,
    interimText,
    finalSegments,
    isConnected,
    error,
  };
}
