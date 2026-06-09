/**
 * Minimal Gemini 2.0 Flash client.
 *
 * Uses raw fetch against the REST API so we don't pull in the @google/genai
 * SDK. Set GEMINI_API_KEY in the environment to enable; when unset, callers
 * should fall back to a deterministic path.
 */

// gemini-2.0-flash was retired by Google (returns 404). gemini-3.5-flash is the
// current stable Flash model — multimodal, accurate on lease PDFs, good capacity.
const GEMINI_MODEL = 'gemini-3.5-flash';
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

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function callGemini<T>(
  parts: GeminiPart[],
  opts: GeminiJsonOptions,
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);

  // Build the request body once and reuse across retries.
  const requestBody = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
      ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
      temperature: 0.2,
      // Flash 2.5/3.x turn on "thinking" by default, which spends the
      // output-token budget (risking truncated JSON) and adds latency/cost.
      // This is deterministic, schema-constrained extraction — disable it.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  try {
    // Pass the key via header, never the URL query string — a key in the URL
    // can end up in proxy/error logs. Header keeps it out of any URL surface.
    // Retry transient capacity errors (503 high demand / 429 rate limit) with
    // a short backoff so a momentary spike doesn't surface as "couldn't parse".
    const MAX_ATTEMPTS = 3;
    let res: Response | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: controller.signal,
        body: requestBody,
      });
      if ((res.status === 503 || res.status === 429) && attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        continue;
      }
      break;
    }

    if (!res || !res.ok) {
      console.error(
        '[Gemini] non-200 response:',
        res?.status,
        res ? await res.text().catch(() => '') : '(no response)',
      );
      return null;
    }

    const data = (await res.json()) as {
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

/**
 * Send `prompt` to Gemini 2.0 Flash and return the parsed JSON response.
 * Returns null on any failure — callers should fall back to a deterministic
 * alternative rather than surfacing the error to the user.
 */
export async function geminiJson<T = unknown>(
  prompt: string,
  opts: GeminiJsonOptions = {},
): Promise<T | null> {
  return callGemini<T>([{ text: prompt }], opts);
}

/**
 * Send a prompt + file (PDF, image, etc.) to Gemini 2.0 Flash. The file is
 * inlined as base64 via `inline_data`. Use for multimodal extraction tasks
 * like parsing a lease PDF.
 *
 * `mimeType` should match the file (e.g. 'application/pdf', 'image/png').
 * Returns null on any failure — caller decides fallback behavior.
 */
export async function geminiJsonFromFile<T = unknown>(
  prompt: string,
  file: Buffer | Uint8Array,
  mimeType: string,
  opts: GeminiJsonOptions = {},
): Promise<T | null> {
  const base64 = Buffer.from(file).toString('base64');
  return callGemini<T>(
    [
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: base64 } },
    ],
    { timeoutMs: opts.timeoutMs ?? 45_000, ...opts },
  );
}
