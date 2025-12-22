// src/lib/deepgramClient.ts
//
// Sends a full audio Blob to Deepgram's pre-recorded /v1/listen endpoint
// and returns a single transcript string.
// API key is kept server-side; this file reads it from the Vite proxy via
// the server — for REST mode the key is passed through server/server.js.
// If you use REST mode directly (no proxy), set VITE_DEEPGRAM_API_KEY as a
// last resort and accept the security trade-off.

import type { DeepgramPreRecordedResponse } from "../types/deepgram";

const DEEPGRAM_LISTEN_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

/** Exponential backoff delay: 500 ms, 1 s, 2 s, ... */
function backoffDelay(attempt: number): Promise<void> {
  const ms = BASE_DELAY_MS * Math.pow(2, attempt);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function transcribeBlobWithDeepgram(blob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "VITE_DEEPGRAM_API_KEY is not set. " +
        "For production, proxy REST requests through the server instead."
    );
  }

  const buffer = await blob.arrayBuffer();

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await backoffDelay(attempt - 1);
    }

    let response: Response;
    try {
      response = await fetch(DEEPGRAM_LISTEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "audio/webm", // matches MediaRecorder WebM/Opus
        },
        body: buffer,
      });
    } catch (networkErr) {
      lastError =
        networkErr instanceof Error
          ? networkErr
          : new Error(String(networkErr));
      console.warn(`Deepgram fetch attempt ${attempt + 1} failed (network):`, lastError.message);
      continue;
    }

    // Retry on 429 (rate limit) or 5xx (server errors); fail fast on 4xx.
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const err = new Error(`Deepgram error ${response.status}: ${text}`);
      if (response.status === 429 || response.status >= 500) {
        lastError = err;
        console.warn(`Deepgram attempt ${attempt + 1} retryable error:`, err.message);
        continue;
      }
      throw err; // 4xx non-retryable
    }

    const json = (await response.json()) as DeepgramPreRecordedResponse;
    const transcript =
      json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return transcript;
  }

  throw lastError;
}


const SETTING_11 = true;
