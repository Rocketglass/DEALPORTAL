/**
 * Minimal Gemini 2.0 Flash client.
 *
 * Uses raw fetch against the REST API so we don't pull in the @google/genai
 * SDK. Set GEMINI_API_KEY in the environment to enable; when unset, callers
 * should fall back to a deterministic path.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export interface GeminiJsonOptions {
  /** Optional JSON schema forcing structured output. */
  responseSchema?: Record<string, unknown>;
  /** Hard ceiling on response tokens. */
  maxOutputTokens?: number;
  /** Cap on round-trip time in ms (default 20s). */
  timeoutMs?: number;
}

/**
 * Send `prompt` to Gemini 2.0 Flash and return the parsed JSON response.
 * Returns null on any failure — callers should fall back to a deterministic
 * alternative rather than surfacing the error to the user.
 */
export async function geminiJson<T = unknown>(
  prompt: string,
  opts: GeminiJsonOptions = {},
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
          ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
          temperature: 0.2,
        },
      }),
    });

    if (!res.ok) {
      console.error('[Gemini] non-200 response:', res.status, await res.text().catch(() => ''));
      return null;
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    try {
      return JSON.parse(text) as T;
    } catch (parseErr) {
      console.error('[Gemini] JSON parse failed:', parseErr, 'body:', text.slice(0, 300));
      return null;
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('[Gemini] request failed:', err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
