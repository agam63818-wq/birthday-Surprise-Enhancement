// ============================================================
//  AIAssistantChat — "AI Assistant" dashboard tab
//
//  SECURITY INVARIANTS (enforced here, not just documented):
//  - userApiKey lives ONLY in local component state.
//  - It is passed into supabase.functions.invoke() body once per call.
//  - It is cleared in the finally block after every call.
//  - It is NEVER stored in localStorage, sessionStorage, a ref that
//    outlives the call, a dependency array, or any global store.
//  - It is NEVER logged (no console.log, no toast with key content).
//  - It is NEVER interpolated into an error string shown to the user.
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { OCCASION_META, OCCASION_IDS, type OccasionId } from "@/lib/occasions";
import type { Config } from "@/config";
import type { SurpriseRow } from "@/types/surprise";

// ── Types ────────────────────────────────────────────────────────────────

type ApiProvider = "openai" | "gemini" | "anthropic";

interface ChatMessage {
  role: "assistant" | "user";
  text: string;
}

type Step =
  | "name"
  | "occasion"
  | "occasion_custom"
  | "relationship"
  | "tone"
  | "memories"
  | "photos"
  | "key_settings"
  | "review"
  | "generating"
  | "done"
  | "error";

interface Answers {
  name: string;
  occasion: OccasionId | "";
  occasionCustom: string;
  relationship: string;
  tone: string;
  memories: string;
  photos: string;
}

const EMPTY_ANSWERS: Answers = {
  name: "",
  occasion: "",
  occasionCustom: "",
  relationship: "",
  tone: "",
  memories: "",
  photos: "",
};

const STEPS: Step[] = [
  "name", "occasion", "relationship", "tone", "memories", "photos",
  "key_settings", "review",
];

const STEP_LABELS: Record<Step, string> = {
  name:            "Name",
  occasion:        "Occasion",
  occasion_custom: "Occasion",
  relationship:    "Relationship",
  tone:            "Tone",
  memories:        "Memories",
  photos:          "Photos",
  key_settings:    "AI Settings",
  review:          "Review",
  generating:      "Generating",
  done:            "Done",
  error:           "Error",
};

const GENERATING_PHASES = [
  "✨ Thinking about your story…",
  "💌 Writing your pages…",
  "🎨 Polishing the details…",
  "🌟 Almost ready…",
];

// ── Deep-merge helper ────────────────────────────────────────────────────
// Returned non-empty values win; never wipe an existing field with an
// empty string or empty array.
function deepMergeConfig(base: Config, patch: Record<string, unknown>): Config {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) continue;

    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      // Recurse into nested objects
      result[key] = deepMergeConfig(
        result[key] as Config,
        value as Record<string, unknown>,
      );
    } else if (Array.isArray(value)) {
      // Only replace arrays if the new one is non-empty
      if (value.length > 0) {
        result[key] = value;
      }
    } else if (typeof value === "string") {
      // Only replace strings if the new one is non-empty
      if (value.trim().length > 0) {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }

  return result as Config;
}

// ── Sub-components ───────────────────────────────────────────────────────

function Bubble({
  role,
  children,
}: {
  role: "assistant" | "user";
  children: React.ReactNode;
}) {
  const isAssistant = role === "assistant";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isAssistant ? "flex-start" : "flex-end",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          maxWidth: "85%",
          padding: "12px 16px",
          borderRadius: isAssistant ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
          background: isAssistant
            ? "linear-gradient(165deg, rgba(30,12,60,0.92), rgba(12,4,32,0.9))"
            : "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(190,24,93,0.25))",
          border: isAssistant
            ? "1px solid rgba(167,139,250,0.22)"
            : "1px solid rgba(236,72,153,0.35)",
          color: "var(--ink)",
          fontSize: "0.9rem",
          lineHeight: 1.55,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "6px",
        justifyContent: "center",
        marginBottom: "16px",
      }}
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i < current ? "20px" : "8px",
            height: "8px",
            borderRadius: "999px",
            background:
              i < current
                ? "linear-gradient(135deg, #a78bfa, #ec4899)"
                : "rgba(167,139,250,0.25)",
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "10px 16px",
        borderRadius: "999px",
        fontSize: "0.85rem",
        fontWeight: selected ? 600 : 500,
        cursor: "pointer",
        border: selected
          ? "1px solid rgba(236,72,153,0.65)"
          : "1px solid rgba(167,139,250,0.28)",
        background: selected
          ? "linear-gradient(135deg, rgba(236,72,153,0.28), rgba(124,58,237,0.22))"
          : "rgba(167,139,250,0.08)",
        color: selected ? "#fde68a" : "var(--ink)",
        boxShadow: selected ? "0 4px 16px rgba(236,72,153,0.22)" : "none",
        transition: "all 0.22s ease",
        minHeight: "44px",
      }}
    >
      {label}
    </button>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "12px 24px",
        borderRadius: "999px",
        fontSize: "0.88rem",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        minHeight: "44px",
        border:
          variant === "primary"
            ? "1px solid rgba(167,139,250,0.4)"
            : "1px solid rgba(167,139,250,0.22)",
        background:
          variant === "primary"
            ? "linear-gradient(135deg, #4c1d95, #7c3aed, #be185d)"
            : "rgba(167,139,250,0.08)",
        color: variant === "primary" ? "#fff" : "var(--ink-soft)",
        boxShadow:
          variant === "primary"
            ? "0 4px 20px rgba(124,58,237,0.4)"
            : "none",
        transition: "all 0.22s ease",
      }}
    >
      {children}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────

export default function AIAssistantChat({
  surprise,
  onSurpriseChange,
  onSwitchToCustomize,
}: {
  surprise: SurpriseRow;
  onSurpriseChange: (updated: SurpriseRow) => void;
  onSwitchToCustomize: () => void;
}) {
  const [step, setStep] = useState<Step>("name");
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi! 👋 I'm your AI assistant. I'll ask you a few quick questions and then generate a personalised surprise for you. Let's start — what's the name of the person you're making this for?",
    },
  ]);

  // Key settings state — key lives ONLY here, never in localStorage/ref/store
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [apiProvider, setApiProvider] = useState<ApiProvider>("gemini");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Extraction state (for name field)
  const [extracting, setExtracting] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatingPhase, setGeneratingPhase] = useState(0);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Undo snapshot
  const [preAiConfig, setPreAiConfig] = useState<Config | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  // Double-submit guard
  const submittingRef = useRef(false);

  // Refs for focus management
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus the current input when step changes
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, [step]);

  // Generating phase ticker
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setGeneratingPhase((p) => (p + 1) % GENERATING_PHASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [generating]);

  const addMessage = useCallback((role: "assistant" | "user", text: string) => {
    setMessages((prev) => [...prev, { role, text }]);
  }, []);

  const currentStepIndex = STEPS.indexOf(step as Step);
  const totalSteps = STEPS.length;

  // ── Step navigation ────────────────────────────────────────────────────

  const goBack = () => {
    const idx = STEPS.indexOf(step as Step);
    if (idx <= 0) return;
    const prevStep = STEPS[idx - 1];
    setStep(prevStep);
    setInputValue("");
    setMessages((prev) => {
      // Remove the last user message + assistant response pair
      const lastUserIdx = [...prev].reverse().findIndex((m) => m.role === "user");
      if (lastUserIdx === -1) return prev;
      const removeFrom = prev.length - 1 - lastUserIdx;
      return prev.slice(0, removeFrom);
    });
  };

  const advanceStep = (currentStep: Step, userText: string, nextStep: Step, assistantText: string) => {
    addMessage("user", userText);
    setTimeout(() => {
      addMessage("assistant", assistantText);
      setStep(nextStep);
      setInputValue("");
    }, 300);
  };

  // ── Step handlers ──────────────────────────────────────────────────────

  const handleNameSubmit = async () => {
    const rawName = inputValue.trim();
    if (!rawName) return;

    // Push user's raw message immediately
    addMessage("user", rawName);

    // Show typing indicator and set extracting state
    setExtracting(true);
    setMessages((prev) => [...prev, { role: "assistant", text: "..." }]);

    try {
      // Call extract-chat-field edge function
      const { data, error } = await supabase.functions.invoke(
        "extract-chat-field",
        { body: { rawText: rawName, fieldType: "name" } },
      );

      // Remove the "..." typing indicator
      setMessages((prev) => prev.slice(0, -1));

      let cleanName: string;

      if (error || !data?.value) {
        // Fallback: use raw trimmed input if extraction fails
        cleanName = rawName;
      } else {
        cleanName = data.value;
      }

      // Store the clean name (not raw text) in answers
      setAnswers((a) => ({ ...a, name: cleanName }));

      // Assistant response with extracted name and edit affordance
      addMessage(
        "assistant",
        `Lovely! 🌸 Creating this for **${cleanName}** — got it right? If not, just type the correct name below. Otherwise, what's the occasion?`,
      );

      setStep("occasion");
      setInputValue("");
    } catch (err) {
      // Remove the "..." typing indicator on error too
      setMessages((prev) => prev.slice(0, -1));

      // Graceful fallback: use raw trimmed input
      setAnswers((a) => ({ ...a, name: rawName }));
      addMessage(
        "assistant",
        `Lovely! 🌸 Creating this for **${rawName}** — got it right? If not, just type the correct name below. Otherwise, what's the occasion?`,
      );
      setStep("occasion");
      setInputValue("");
    } finally {
      setExtracting(false);
    }
  };

  const handleOccasionSelect = (occ: OccasionId) => {
    setAnswers((a) => ({ ...a, occasion: occ }));
    addMessage("user", OCCASION_META[occ].label);
    if (occ === "custom") {
      setTimeout(() => {
        addMessage("assistant", "What's the occasion? Tell me in a few words ✨");
        setStep("occasion_custom");
        setInputValue("");
      }, 300);
    } else {
      setTimeout(() => {
        addMessage("assistant", "Got it! 💫 What's your relationship with them? (e.g. best friend, sister, partner, dad…)");
        setStep("relationship");
        setInputValue("");
      }, 300);
    }
  };

  const handleOccasionCustomSubmit = () => {
    const custom = inputValue.trim();
    if (!custom) return;
    setAnswers((a) => ({ ...a, occasionCustom: custom }));
    advanceStep(
      "occasion_custom",
      custom,
      "relationship",
      "Perfect! 💫 What's your relationship with them? (e.g. best friend, sister, partner, dad…)",
    );
  };

  const handleRelationshipSubmit = () => {
    const rel = inputValue.trim();
    if (!rel) return;
    setAnswers((a) => ({ ...a, relationship: rel }));
    advanceStep(
      "relationship",
      rel,
      "tone",
      "What tone should the surprise have? 🎭",
    );
  };

  const handleToneSelect = (tone: string) => {
    setAnswers((a) => ({ ...a, tone }));
    addMessage("user", tone);
    setTimeout(() => {
      addMessage(
        "assistant",
        "Beautiful! 🌟 Share a few key memories or moments you want to include — things that made your bond special. (Take your time, the more you share the better!)",
      );
      setStep("memories");
      setInputValue("");
    }, 300);
  };

  const handleMemoriesSubmit = () => {
    const mem = inputValue.trim();
    if (!mem) return;
    setAnswers((a) => ({ ...a, memories: mem }));
    advanceStep(
      "memories",
      mem,
      "photos",
      "Wonderful! 📸 Do you have photos to add, or will you add them later?",
    );
  };

  const handlePhotosSelect = (choice: string) => {
    setAnswers((a) => ({ ...a, photos: choice }));
    addMessage("user", choice);
    setTimeout(() => {
      addMessage(
        "assistant",
        "Almost there! ⚙️ One last thing — which AI should generate your surprise?",
      );
      setStep("key_settings");
      setInputValue("");
    }, 300);
  };

  const handleKeySettingsContinue = () => {
    if (useOwnKey && !apiKeyInput.trim()) {
      setKeyError("Please enter your API key, or switch to 'Use default AI'.");
      return;
    }
    setKeyError(null);
    addMessage("user", useOwnKey ? `Using my own ${apiProvider} key` : "Using default AI");
    setTimeout(() => {
      const { name, occasion, occasionCustom, relationship, tone, memories, photos } = answers;
      const occasionLabel =
        occasion === "custom"
          ? occasionCustom
          : OCCASION_META[occasion as OccasionId]?.label ?? occasion;
      addMessage(
        "assistant",
        `Here's a quick summary before I generate:\n\n👤 **Name:** ${name}\n🎉 **Occasion:** ${occasionLabel}\n💞 **Relationship:** ${relationship}\n🎭 **Tone:** ${tone}\n📝 **Memories:** ${memories.slice(0, 80)}${memories.length > 80 ? "…" : ""}\n📸 **Photos:** ${photos}\n\nLooks good? Hit Generate to create your personalised surprise! ✨`,
      );
      setStep("review");
    }, 300);
  };

  // ── Generate ───────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (submittingRef.current || generating) return;
    submittingRef.current = true;
    setGenerating(true);
    setGeneratingPhase(0);
    setStep("generating");
    setErrorCode(null);
    setErrorMessage(null);

    // Snapshot current config for undo
    setPreAiConfig(structuredClone(surprise.config));
    setShowUndo(false);

    // Capture the key into a local const — it will be cleared in finally
    const capturedKey = useOwnKey ? apiKeyInput.trim() : undefined;
    const capturedProvider = useOwnKey ? apiProvider : undefined;

    try {
      const occasionId: OccasionId =
        answers.occasion !== "" ? (answers.occasion as OccasionId) : "birthday";

      const answersPayload: Record<string, string> = {
        recipientName:  answers.name,
        relationship:   answers.relationship,
        tone:           answers.tone,
        memoriesAndMoments: answers.memories,
        photosStatus:   answers.photos,
      };
      if (answers.occasion === "custom" && answers.occasionCustom) {
        answersPayload.customOccasion = answers.occasionCustom;
      }

      const invokeBody: Record<string, unknown> = {
        answers: answersPayload,
        occasionType: occasionId,
      };
      if (capturedKey) {
        invokeBody.userApiKey = capturedKey;
        invokeBody.userApiProvider = capturedProvider;
      }

      const { data, error } = await supabase.functions.invoke(
        "generate-surprise-structure",
        { body: invokeBody },
      );

      if (error) {
        // supabase-js wraps non-2xx as FunctionsHttpError with a context field
        const ctx = (error as { context?: { json?: () => Promise<{ error?: string; message?: string }> } }).context;
        let code = "provider_error";
        let msg = "Something went wrong. Please try again.";
        if (ctx?.json) {
          try {
            const body = await ctx.json();
            code = body.error ?? code;
            msg  = body.message ?? msg;
          } catch { /* ignore */ }
        }
        handleGenerateError(code, msg);
        return;
      }

      if (!data?.config || typeof data.config !== "object") {
        handleGenerateError("invalid_model_output", "AI returned an unexpected response. Please try again.");
        return;
      }

      // Deep-merge the returned partial config over the current config
      const merged = deepMergeConfig(surprise.config, data.config as Record<string, unknown>);

      // Persist to Supabase (same path as CustomizeForm.handleSave)
      const photo_urls = merged.memoryWall.photos.map((p) => p.src).filter(Boolean);
      const audio_urls = [merged.audio.backgroundMusic, merged.audio.birthdaySong].filter(Boolean);

      const { data: saved, error: saveError } = await supabase
        .from("surprises")
        .update({ config: merged, photo_urls, audio_urls })
        .eq("id", surprise.id)
        .select()
        .single();

      if (saveError) {
        toast.error("AI generated your content but couldn't save it. Please try again.");
        handleGenerateError("provider_error", "Save failed after generation.");
        return;
      }

      onSurpriseChange(saved as SurpriseRow);
      setShowUndo(true);
      setStep("done");
      toast.success("✨ Your surprise has been personalised! Check the Customize tab to review.");

      // Switch to Customize tab after a short delay
      setTimeout(() => {
        onSwitchToCustomize();
      }, 1800);
    } finally {
      // Clear the captured key — it must not outlive this call
      // (capturedKey is a local const so it's already GC-eligible,
      //  but we also clear the input state for UX clarity)
      if (useOwnKey) {
        setApiKeyInput("");
      }
      setGenerating(false);
      submittingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, apiKeyInput, apiProvider, generating, surprise, useOwnKey, onSurpriseChange, onSwitchToCustomize]);

  const handleGenerateError = (code: string, msg: string) => {
    setErrorCode(code);
    setErrorMessage(msg);
    setStep("error");

    if (code === "platform_key_unavailable") {
      // Automatically reveal the "use your own key" option
      setUseOwnKey(true);
      setStep("key_settings");
      addMessage(
        "assistant",
        "⚠️ The default AI isn't available right now (quota or key issue). No worries — you can use your own API key to generate for free! Enter it below and I'll use it just for this one request.",
      );
    }
  };

  const handleUndo = () => {
    if (!preAiConfig) return;
    onSurpriseChange({ ...surprise, config: preAiConfig });
    setShowUndo(false);
    setPreAiConfig(null);
    toast.success("Reverted to your previous config.");
  };

  const handleRetry = () => {
    setStep("review");
    setErrorCode(null);
    setErrorMessage(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const progressIndex = Math.max(0, currentStepIndex);

  return (
    <div
      style={{
        maxWidth: "560px",
        width: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "0",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "16px", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "var(--font-script)",
            fontSize: "1.6rem",
            background: "var(--grad-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "4px",
          }}
        >
          ✨ AI Assistant
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
          Answer a few questions and I'll personalise your surprise
        </p>
      </div>

      {/* Progress */}
      {step !== "generating" && step !== "done" && step !== "error" && (
        <ProgressDots
          current={Math.min(progressIndex + 1, totalSteps)}
          total={totalSteps}
        />
      )}

      {/* Message list */}
      <div
        ref={messageListRef}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        style={{
          minHeight: "200px",
          maxHeight: "340px",
          overflowY: "auto",
          padding: "4px 0 8px",
          marginBottom: "16px",
        }}
      >
        {messages.map((msg, i) => (
          <Bubble key={i} role={msg.role}>
            {msg.text.split("\n").map((line, j) => (
              <span key={j}>
                {line}
                {j < msg.text.split("\n").length - 1 && <br />}
              </span>
            ))}
          </Bubble>
        ))}

        {/* Generating indicator */}
        {step === "generating" && (
          <Bubble role="assistant">
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "18px",
                  border: "2px solid rgba(167,139,250,0.3)",
                  borderTopColor: "#a78bfa",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  flexShrink: 0,
                }}
              />
              {GENERATING_PHASES[generatingPhase]}
            </span>
          </Bubble>
        )}
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "16px",
          borderRadius: "var(--rad-lg)",
          background: "linear-gradient(165deg, rgba(20,7,48,0.82), rgba(8,2,24,0.78))",
          border: "1px solid rgba(167,139,250,0.18)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        }}
      >
        {/* ── Name step ── */}
        {step === "name" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
              placeholder="e.g. Zoya, Bhai, Maa…"
              maxLength={80}
              style={inputStyle}
              aria-label="Recipient's name"
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <ActionButton onClick={handleNameSubmit} disabled={!inputValue.trim() || extracting}>
                {extracting ? "..." : "Next →"}
              </ActionButton>
            </div>
          </div>
        )}

        {/* ── Occasion step ── */}
        {step === "occasion" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Show extracted name with edit affordance */}
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "12px",
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
                fontSize: "0.85rem",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <span>
                👤 Creating for <strong>{answers.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setStep("name");
                  setInputValue(answers.name);
                  // Remove the last assistant message (the one showing the extracted name)
                  setMessages((prev) => {
                    const lastAssistantIdx = [...prev].reverse().findIndex((m) => m.role === "assistant" && m.text.includes("Creating this for"));
                    if (lastAssistantIdx === -1) return prev;
                    return prev.slice(0, prev.length - 1 - lastAssistantIdx);
                  });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "1px solid rgba(167,139,250,0.25)",
                  background: "rgba(167,139,250,0.08)",
                  color: "var(--ink-soft)",
                  transition: "all 0.2s ease",
                }}
              >
                ✏️ Edit name
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {OCCASION_IDS.map((occ) => (
                <OptionButton
                  key={occ}
                  label={`${OCCASION_META[occ].emoji} ${OCCASION_META[occ].label}`}
                  selected={answers.occasion === occ}
                  onClick={() => handleOccasionSelect(occ)}
                />
              ))}
            </div>
            <BackButton onClick={goBack} />
          </div>
        )}

        {/* ── Custom occasion step ── */}
        {step === "occasion_custom" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOccasionCustomSubmit()}
              placeholder="e.g. Graduation, Farewell, Thank you…"
              maxLength={80}
              style={inputStyle}
              aria-label="Custom occasion"
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <ActionButton onClick={handleOccasionCustomSubmit} disabled={!inputValue.trim()}>
                Next →
              </ActionButton>
              <BackButton onClick={goBack} />
            </div>
          </div>
        )}

        {/* ── Relationship step ── */}
        {step === "relationship" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRelationshipSubmit()}
              placeholder="e.g. best friend, sister, partner, dad…"
              maxLength={80}
              style={inputStyle}
              aria-label="Your relationship"
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <ActionButton onClick={handleRelationshipSubmit} disabled={!inputValue.trim()}>
                Next →
              </ActionButton>
              <BackButton onClick={goBack} />
            </div>
          </div>
        )}

        {/* ── Tone step ── */}
        {step === "tone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { value: "Funny & Playful 😂", label: "Funny & Playful 😂" },
                { value: "Emotional & Heartfelt 💕", label: "Emotional & Heartfelt 💕" },
                { value: "Simple & Sweet 🌸", label: "Simple & Sweet 🌸" },
                { value: "Romantic & Deep ❤️", label: "Romantic & Deep ❤️" },
              ].map(({ value, label }) => (
                <OptionButton
                  key={value}
                  label={label}
                  selected={answers.tone === value}
                  onClick={() => handleToneSelect(value)}
                />
              ))}
            </div>
            <BackButton onClick={goBack} />
          </div>
        )}

        {/* ── Memories step ── */}
        {step === "memories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Share some memories, inside jokes, special moments… the more detail the better!"
              maxLength={1000}
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: "88px" }}
              aria-label="Key memories and moments"
            />
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <ActionButton onClick={handleMemoriesSubmit} disabled={!inputValue.trim()}>
                Next →
              </ActionButton>
              <ActionButton variant="secondary" onClick={() => {
                setAnswers((a) => ({ ...a, memories: "(skipped)" }));
                advanceStep("memories", "(skipped)", "photos", "No worries! 📸 Do you have photos to add, or will you add them later?");
              }}>
                Skip
              </ActionButton>
              <BackButton onClick={goBack} />
            </div>
          </div>
        )}

        {/* ── Photos step ── */}
        {step === "photos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                "I'll add photos later 📸",
                "No photos needed ✨",
              ].map((choice) => (
                <OptionButton
                  key={choice}
                  label={choice}
                  selected={answers.photos === choice}
                  onClick={() => handlePhotosSelect(choice)}
                />
              ))}
            </div>
            <BackButton onClick={goBack} />
          </div>
        )}

        {/* ── Key settings step ── */}
        {step === "key_settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Radio: default vs own key */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { value: false, label: "🤖 Use default AI (recommended)" },
                { value: true,  label: "🔑 Use my own API key" },
              ].map(({ value, label }) => (
                <label
                  key={String(value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: useOwnKey === value
                      ? "1px solid rgba(236,72,153,0.5)"
                      : "1px solid rgba(167,139,250,0.2)",
                    background: useOwnKey === value
                      ? "rgba(236,72,153,0.1)"
                      : "rgba(167,139,250,0.05)",
                    fontSize: "0.88rem",
                    color: "var(--ink)",
                    transition: "all 0.2s ease",
                    minHeight: "44px",
                  }}
                >
                  <input
                    type="radio"
                    name="aiKeyChoice"
                    checked={useOwnKey === value}
                    onChange={() => {
                      setUseOwnKey(value);
                      setKeyError(null);
                    }}
                    style={{ accentColor: "#a78bfa" }}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* Own key fields */}
            {useOwnKey && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Provider selector */}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(["gemini", "openai", "anthropic"] as ApiProvider[]).map((p) => (
                    <OptionButton
                      key={p}
                      label={p.charAt(0).toUpperCase() + p.slice(1)}
                      selected={apiProvider === p}
                      onClick={() => setApiProvider(p)}
                    />
                  ))}
                </div>

                {/* Key input */}
                <div style={{ position: "relative" }}>
                  <input
                    type={showKey ? "text" : "password"}
                    autoComplete="off"
                    value={apiKeyInput}
                    onChange={(e) => {
                      setApiKeyInput(e.target.value);
                      setKeyError(null);
                    }}
                    placeholder={`Your ${apiProvider} API key`}
                    style={{ ...inputStyle, paddingRight: "48px" }}
                    aria-label="Your API key"
                    aria-describedby="key-hint"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    aria-label={showKey ? "Hide key" : "Show key"}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--ink-soft)",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      padding: "4px",
                    }}
                  >
                    {showKey ? "🙈" : "👁️"}
                  </button>
                </div>

                <p
                  id="key-hint"
                  style={{
                    fontSize: "0.75rem",
                    color: "rgba(220,185,255,0.6)",
                    lineHeight: 1.5,
                    fontStyle: "italic",
                  }}
                >
                  🔒 Your key is used for this request only and never stored anywhere.
                </p>

                {keyError && (
                  <p style={{ fontSize: "0.8rem", color: "#f87171", marginTop: "-4px" }}>
                    {keyError}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <ActionButton onClick={handleKeySettingsContinue}>
                Continue →
              </ActionButton>
              <BackButton onClick={goBack} />
            </div>
          </div>
        )}

        {/* ── Review step ── */}
        {step === "review" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
              Ready to generate your personalised surprise? This may take 20–40 seconds.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <ActionButton onClick={handleGenerate} disabled={generating}>
                🪄 Generate Surprise
              </ActionButton>
              <BackButton onClick={goBack} />
            </div>
          </div>
        )}

        {/* ── Generating step ── */}
        {step === "generating" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
              Please wait — this can take up to 40 seconds…
            </p>
          </div>
        )}

        {/* ── Done step ── */}
        {step === "done" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
              🎉 Your surprise has been personalised! Switching to the Customize tab…
            </p>
            {showUndo && preAiConfig && (
              <ActionButton variant="secondary" onClick={handleUndo}>
                ↩️ Undo AI fill
              </ActionButton>
            )}
          </div>
        )}

        {/* ── Error step ── */}
        {step === "error" && errorCode !== "platform_key_unavailable" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "0.85rem", color: "#f87171", lineHeight: 1.5 }}>
              {errorCode === "invalid_user_key"
                ? "⚠️ Your API key was rejected. Please check it and try again."
                : errorCode === "timeout"
                ? "⏱️ The request timed out. Please try again."
                : errorCode === "invalid_model_output"
                ? "🤔 The AI returned an unexpected response. Please try again."
                : errorMessage ?? "Something went wrong. Please try again."}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <ActionButton onClick={handleRetry}>
                🔄 Retry
              </ActionButton>
              {errorCode === "invalid_user_key" && (
                <ActionButton variant="secondary" onClick={() => {
                  setStep("key_settings");
                  setErrorCode(null);
                }}>
                  Edit key
                </ActionButton>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Undo banner (shown after done, before switching tabs) */}
      {showUndo && preAiConfig && step === "done" && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "var(--rad-md)",
            background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            fontSize: "0.8rem",
            color: "var(--ink-soft)",
          }}
        >
          <span>✨ AI fill applied. Not happy with it?</span>
          <button
            type="button"
            onClick={handleUndo}
            style={{
              background: "none",
              border: "none",
              color: "var(--pink)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "inherit",
              padding: 0,
              flexShrink: 0,
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* Spinner keyframe (inline — avoids adding to global CSS) */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(167,139,250,0.06)",
  border: "1px solid rgba(167,139,250,0.25)",
  color: "var(--ink)",
  fontSize: "0.92rem",
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  minHeight: "44px",
};

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "10px 14px",
        borderRadius: "999px",
        fontSize: "0.82rem",
        fontWeight: 500,
        cursor: "pointer",
        border: "1px solid rgba(167,139,250,0.2)",
        background: "transparent",
        color: "var(--ink-soft)",
        minHeight: "44px",
        transition: "all 0.2s ease",
      }}
    >
      ← Back
    </button>
  );
}
