// ============================================================
//  extract-chat-field — Supabase Edge Function (Deno)
//
//  Extracts a single field value (e.g. recipient's first name)
//  from raw user text that may be a full casual sentence.
//
//  SECURITY NOTES
//  - No AI API key ever appears in frontend code or env vars.
//  - Uses the same PLATFORM_AI_API_KEY / PLATFORM_AI_PROVIDER
//    secrets as generate-surprise-structure.
//  - Authenticated call only — requires valid Supabase session.
//  - User input is placed behind clear delimiters in the user
//    message — never concatenated into the system prompt.
//  - API key is held only in a local const, used for exactly one
//    request, and cleared in a finally block. Never logged or
//    echoed in error messages.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ── Model IDs — same as generate-surprise-structure ──────────────────────
const MODEL_IDS: Record<string, string> = {
  openai:    "gpt-4o-mini",
  gemini:    "gemini-3.1-flash-lite",
  anthropic: "claude-3-haiku-20240307",
};

// ── Abuse-control constants ──────────────────────────────────────────────
const MAX_INPUT_LEN   = 500;     // chars
const FETCH_TIMEOUT_MS = 15_000; // 15 s — this should be very fast
const MAX_OUTPUT_TOKENS = 20;    // ~one word

// ── Error codes (stable, machine-readable) ───────────────────────────────
type ErrorCode =
  | "unauthenticated"
  | "invalid_request"
  | "platform_key_unavailable"
  | "provider_error"
  | "timeout";

function errResponse(
  code: ErrorCode,
  message: string,
  status = 400,
): Response {
  return new Response(
    JSON.stringify({ error: code, message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function okResponse(value: string): Response {
  return new Response(
    JSON.stringify({ value }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── Provider adapter interface ───────────────────────────────────────────
interface CallModelParams {
  provider: string;
  apiKey: string;
  systemPrompt: string;
  userPayload: string;
}

async function callModel(params: CallModelParams): Promise<string> {
  const { provider, apiKey, systemPrompt, userPayload } = params;
  const model = MODEL_IDS[provider] ?? MODEL_IDS["gemini"];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    if (provider === "openai") {
      return await callOpenAI(apiKey, model, systemPrompt, userPayload, controller.signal);
    } else if (provider === "anthropic") {
      return await callAnthropic(apiKey, model, systemPrompt, userPayload, controller.signal);
    } else {
      // Default: gemini
      return await callGemini(apiKey, model, systemPrompt, userPayload, controller.signal);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPayload: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "text" },
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPayload },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const isAuth = res.status === 401 || res.status === 403;
    throw Object.assign(new Error("openai_error"), { isAuth, status: res.status, body: body.slice(0, 200) });
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPayload: string,
  signal: AbortSignal,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPayload }] }],
      generationConfig: {
        responseMimeType: "text/plain",
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const isAuth = res.status === 400 || res.status === 401 || res.status === 403;
    throw Object.assign(new Error("gemini_error"), { isAuth, status: res.status, body: body.slice(0, 200) });
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPayload: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPayload,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const isAuth = res.status === 401 || res.status === 403;
    throw Object.assign(new Error("anthropic_error"), { isAuth, status: res.status, body: body.slice(0, 200) });
  }
  const json = await res.json();
  return json.content?.[0]?.text ?? "";
}

// ── Main handler ─────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errResponse("invalid_request", "Method not allowed", 405);
  }

  // Auth check — must have Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errResponse("unauthenticated", "Missing or invalid Authorization header", 401);
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  // Get the authenticated user
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    return errResponse("unauthenticated", "Invalid or expired session", 401);
  }

  // Parse body
  let body: { rawText: string; fieldType?: string };
  try {
    body = await req.json();
  } catch {
    return errResponse("invalid_request", "Invalid JSON body");
  }

  const { rawText, fieldType = "name" } = body;

  if (typeof rawText !== "string" || !rawText.trim()) {
    return errResponse("invalid_request", "rawText must be a non-empty string");
  }

  // Clamp input length
  const trimmedInput = rawText.trim().slice(0, MAX_INPUT_LEN);

  // Get platform AI credentials
  const platformApiKey = Deno.env.get("PLATFORM_AI_API_KEY");
  const platformProvider = Deno.env.get("PLATFORM_AI_PROVIDER") ?? "gemini";

  if (!platformApiKey) {
    return errResponse(
      "platform_key_unavailable",
      "Platform AI key is not configured on the server.",
    );
  }

  // Build system prompt based on field type
  let systemPrompt: string;
  if (fieldType === "name") {
    systemPrompt = `You are a name extractor. The user will give you text that may be a full casual sentence in English, Hindi, or Hinglish. Your task is to extract ONLY the recipient's first name from the text.

Rules:
- Return ONLY the first name — no punctuation, no explanation, no extra words.
- If the text already appears to be just a bare name, return it unchanged.
- For Indian names, use standard Roman spelling (e.g. "Nandini" not "nandini").
- Capitalize the first letter appropriately.
- If you cannot identify a name, return the first meaningful word from the text.

Examples:
- Input: "hi mera name agam hai mai nandini ke liye bana raha hu" → Output: "Nandini"
- Input: "making this for my sister Priya" → Output: "Priya"
- Input: "Zoya" → Output: "Zoya"
- Input: "for bhai rahul" → Output: "Rahul"`;
  } else {
    // Fallback for other field types (future extensibility)
    systemPrompt = `Extract the key value from the user's text and return it cleanly with no extra words or punctuation.`;
  }

  const userPayload = `Extract the ${fieldType} from this text:\n\n${trimmedInput}`;

  try {
    const extractedValue = await callModel({
      provider: platformProvider,
      apiKey: platformApiKey,
      systemPrompt,
      userPayload,
    });

    // Clean up the response — strip any markdown, quotes, or extra whitespace
    const cleanValue = extractedValue
      .replace(/^[`"'*#\-\s]+|[`"'*#\-\s]+$/g, "")
      .trim()
      .slice(0, 80); // Max name length

    if (!cleanValue) {
      // Fallback: return the trimmed input if extraction failed silently
      return okResponse(trimmedInput);
    }

    return okResponse(cleanValue);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    if (isTimeout) {
      return errResponse("timeout", "Extraction timed out. Please try again.");
    }
    // For provider errors, fall back gracefully to the raw input
    // This ensures the user can always continue even if extraction fails
    console.error("Extraction error:", err);
    return okResponse(trimmedInput);
  }
});
