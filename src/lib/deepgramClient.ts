// src/lib/deepgramClient.ts

// Sends a full audio Blob to Deepgram's pre-recorded /v1/listen endpoint
// and returns a single transcript string. [web:212][web:207]

export async function transcribeBlobWithDeepgram(blob: Blob): Promise<string> {
  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("VITE_DEEPGRAM_API_KEY is not set.");
  }

  const buffer = await blob.arrayBuffer();

  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/webm", // matches MediaRecorder WebM/Opus [web:207]
      },
      body: buffer,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Deepgram error ${response.status}: ${text}`);
  }

  const json = (await response.json()) as any;
  const transcript: string =
    json?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

  return transcript;
}
