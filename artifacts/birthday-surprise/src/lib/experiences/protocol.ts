/**
 * Versioned, dependency-free protocol between the React host and a bundled
 * experience iframe. This module deliberately has no DOM or React imports so
 * it can also be used by workers, tests, and edge-side validation.
 *
 * The envelope is closed: every key not listed by a message schema is
 * rejected. `config` is the one intentionally open object because each
 * experience owns its own optional config slice. It is still restricted to
 * bounded, plain JSON and dangerous prototype keys are rejected recursively.
 */

export const EXPERIENCE_PROTOCOL_VERSION = 1 as const;
export const EXPERIENCE_IDS = ["heart-tunnel", "love-confession", "love-drive"] as const;
export type ExperienceId = (typeof EXPERIENCE_IDS)[number];

export const EXPERIENCE_THEME_TOKENS = [
  "--exp-accent",
  "--exp-accent-2",
  "--exp-bg",
  "--exp-text",
] as const;
export type ExperienceThemeToken = (typeof EXPERIENCE_THEME_TOKENS)[number];
export type ExperienceTheme = Partial<Record<ExperienceThemeToken, string>>;

export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

export const PROTOCOL_LIMITS = {
  errorCode: 64,
  errorMessage: 200,
  occasion: 64,
  themeValue: 128,
  configString: 6000,
  configDepth: 8,
  configNodes: 2000,
  configCharacters: 60000,
  configArrayLength: 512,
  configKey: 120,
} as const;

export interface InitMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "init";
  experience: ExperienceId;
  config: JsonObject;
  theme: ExperienceTheme;
  reducedMotion: boolean;
  muted: boolean;
  occasion: string;
}

export interface UpdateMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "update";
  muted?: boolean;
  reducedMotion?: boolean;
  theme?: ExperienceTheme;
}

export interface PauseMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "pause";
}

export interface ResumeMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "resume";
}

export interface ReplayMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "replay";
}

export type HostToFrameMessage =
  | InitMessage
  | UpdateMessage
  | PauseMessage
  | ResumeMessage
  | ReplayMessage;

export interface ReadyMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "ready";
}

export interface NextMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "next";
}

export interface CompleteMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "complete";
}

export interface ReplayedMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "replayed";
}

export interface ExperienceErrorMessage {
  v: typeof EXPERIENCE_PROTOCOL_VERSION;
  type: "error";
  code: string;
  message: string;
}

export type FrameToHostMessage =
  | ReadyMessage
  | NextMessage
  | CompleteMessage
  | ReplayedMessage
  | ExperienceErrorMessage;

const own = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Text is data, never markup. Newlines/tabs are allowed for letters. */
function isPlainText(value: unknown, maxLength: number, allowEmpty = true): value is string {
  if (typeof value !== "string" || value.length > maxLength || (!allowEmpty && value.length === 0)) {
    return false;
  }
  // Reject control characters other than tab/newline/carriage return.
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return false;
  // Reject markup-shaped input early as defence in depth. Renderers must use
  // textContent even for strings which pass this check.
  if (/<\s*\/?\s*[a-z][^>]*>/i.test(value)) return false;
  if (/(?:javascript|vbscript)\s*:/i.test(value)) return false;
  return true;
}

function isSafeThemeValue(value: unknown): value is string {
  if (!isPlainText(value, PROTOCOL_LIMITS.themeValue)) return false;
  // Theme tokens are colours/small CSS values, not arbitrary stylesheets.
  // Disallow declaration/rule boundaries and external/resource-bearing CSS.
  if (/[;{}<>\\]/.test(value) || /(?:url|expression|behavior|@import)\s*\(?/i.test(value)) {
    return false;
  }
  return /^[#a-z0-9.,%()\s/+-]+$/i.test(value);
}

function isTheme(value: unknown): value is ExperienceTheme {
  if (!isPlainObject(value)) return false;
  return Object.entries(value).every(([key, token]) =>
    (EXPERIENCE_THEME_TOKENS as readonly string[]).includes(key) && isSafeThemeValue(token),
  );
}

interface JsonBudget {
  nodes: number;
  characters: number;
}

function isBoundedJson(value: unknown, depth: number, budget: JsonBudget): value is JsonValue {
  budget.nodes += 1;
  if (budget.nodes > PROTOCOL_LIMITS.configNodes || depth > PROTOCOL_LIMITS.configDepth) {
    return false;
  }

  if (value === null || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    budget.characters += value.length;
    return (
      budget.characters <= PROTOCOL_LIMITS.configCharacters &&
      isPlainText(value, PROTOCOL_LIMITS.configString)
    );
  }
  if (typeof value !== "object") return false;

  if (Array.isArray(value)) {
    if (value.length > PROTOCOL_LIMITS.configArrayLength) return false;
    // Sparse arrays and custom properties are not plain JSON arrays.
    const keys = Object.keys(value);
    if (keys.length !== value.length) return false;
    for (let index = 0; index < value.length; index += 1) {
      if (!own(value, String(index)) || !isBoundedJson(value[index], depth + 1, budget)) {
        return false;
      }
    }
    return true;
  }

  if (!isPlainObject(value)) return false;
  for (const [key, nested] of Object.entries(value)) {
    if (
      key === "__proto__" ||
      key === "prototype" ||
      key === "constructor" ||
      key.length > PROTOCOL_LIMITS.configKey ||
      !isPlainText(key, PROTOCOL_LIMITS.configKey, false)
    ) {
      return false;
    }
    budget.characters += key.length;
    if (budget.characters > PROTOCOL_LIMITS.configCharacters) return false;
    if (!isBoundedJson(nested, depth + 1, budget)) return false;
  }
  return true;
}

function isConfig(value: unknown): value is JsonObject {
  return isPlainObject(value) && isBoundedJson(value, 0, { nodes: 0, characters: 0 });
}

function hasExactShape(
  value: unknown,
  fields: Record<string, (nested: unknown) => boolean>,
  required: readonly string[] = [],
): value is Record<string, unknown> {
  if (!isPlainObject(value)) return false;
  if (!required.every((key) => own(value, key))) return false;
  return Object.entries(value).every(([key, nested]) => own(fields, key) && fields[key](nested));
}

const version = (value: unknown): boolean => value === EXPERIENCE_PROTOCOL_VERSION;
const boolean = (value: unknown): boolean => typeof value === "boolean";
const experience = (value: unknown): value is ExperienceId =>
  typeof value === "string" && (EXPERIENCE_IDS as readonly string[]).includes(value);
const occasion = (value: unknown): boolean => isPlainText(value, PROTOCOL_LIMITS.occasion, false);
const baseFields = { v: version };

function isControlMessage(value: unknown, type: string): boolean {
  return hasExactShape(value, { ...baseFields, type: (nested) => nested === type }, ["v", "type"]);
}

export function isHostToFrameMessage(value: unknown): value is HostToFrameMessage {
  try {
    if (!isPlainObject(value) || value.v !== EXPERIENCE_PROTOCOL_VERSION || typeof value.type !== "string") {
      return false;
    }
    switch (value.type) {
      case "init":
        return hasExactShape(value, {
          ...baseFields,
          type: (nested) => nested === "init",
          experience,
          config: isConfig,
          theme: isTheme,
          reducedMotion: boolean,
          muted: boolean,
          occasion,
        }, ["v", "type", "experience", "config", "theme", "reducedMotion", "muted", "occasion"]);
      case "update":
        return hasExactShape(value, {
          ...baseFields,
          type: (nested) => nested === "update",
          muted: boolean,
          reducedMotion: boolean,
          theme: isTheme,
        }, ["v", "type"]);
      case "pause":
      case "resume":
      case "replay":
        return isControlMessage(value, value.type);
      default:
        return false;
    }
  } catch {
    // Hostile proxies/getters must not be able to break the message handler.
    return false;
  }
}

export function isFrameToHostMessage(value: unknown): value is FrameToHostMessage {
  try {
    if (!isPlainObject(value) || value.v !== EXPERIENCE_PROTOCOL_VERSION || typeof value.type !== "string") {
      return false;
    }
    switch (value.type) {
      case "ready":
      case "next":
      case "complete":
      case "replayed":
        return isControlMessage(value, value.type);
      case "error":
        return hasExactShape(value, {
          ...baseFields,
          type: (nested) => nested === "error",
          code: (nested) => isPlainText(nested, PROTOCOL_LIMITS.errorCode, false),
          message: (nested) => isPlainText(nested, PROTOCOL_LIMITS.errorMessage),
        }, ["v", "type", "code", "message"]);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// Readable aliases for callers which prefer “validate” terminology.
export const validateHostToFrameMessage = isHostToFrameMessage;
export const validateFrameToHostMessage = isFrameToHostMessage;
