import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_PROTOCOL_VERSION,
  PROTOCOL_LIMITS,
  isFrameToHostMessage,
  isHostToFrameMessage,
  type HostToFrameMessage,
} from "@/lib/experiences/protocol";

const validInit = (): HostToFrameMessage => ({
  v: EXPERIENCE_PROTOCOL_VERSION,
  type: "init",
  experience: "love-drive",
  config: {
    objective: "Find the surprises",
    letterBody: ["First paragraph", "Second paragraph"],
    nested: { enabled: true, count: 3, empty: null },
  },
  theme: { "--exp-accent": "#ff6b9d", "--exp-text": "rgba(255, 255, 255, 0.9)" },
  reducedMotion: false,
  muted: true,
  occasion: "birthday",
});

describe("experience protocol validators", () => {
  it("accepts every valid host message and every valid frame message", () => {
    expect(isHostToFrameMessage(validInit())).toBe(true);
    expect(isHostToFrameMessage({ v: 1, type: "update", muted: false })).toBe(true);
    expect(isHostToFrameMessage({ v: 1, type: "update", theme: {} })).toBe(true);
    for (const type of ["pause", "resume", "replay"] as const) {
      expect(isHostToFrameMessage({ v: 1, type })).toBe(true);
    }
    for (const type of ["ready", "next", "complete", "replayed"] as const) {
      expect(isFrameToHostMessage({ v: 1, type })).toBe(true);
    }
    expect(isFrameToHostMessage({ v: 1, type: "error", code: "WEBGL_UNAVAILABLE", message: "Try another browser." })).toBe(true);
  });

  it("rejects wrong versions, unknown types, wrong source shapes and extra envelope keys", () => {
    expect(isHostToFrameMessage({ ...validInit(), v: 2 })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), type: "unknown" })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), extra: true })).toBe(false);
    expect(isHostToFrameMessage({ v: 1, type: "update", unexpected: false })).toBe(false);
    expect(isHostToFrameMessage(null)).toBe(false);
    expect(isHostToFrameMessage([])).toBe(false);
    expect(isHostToFrameMessage("init")).toBe(false);
    expect(isFrameToHostMessage({ v: 1, type: "next", source: "another-window" })).toBe(false);
    expect(isFrameToHostMessage({ v: 1, type: "error", code: "X", message: "ok", extra: 1 })).toBe(false);
  });

  it("rejects wrong field types and non-JSON values", () => {
    expect(isHostToFrameMessage({ ...validInit(), muted: "yes" })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), experience: "other" })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: [] })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { value: Number.NaN } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { value: Number.POSITIVE_INFINITY } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { value: undefined } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { value: () => true } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { value: new Date() } })).toBe(false);
  });

  it("rejects oversize strings, excessive nesting and unbounded collections", () => {
    expect(isHostToFrameMessage({ ...validInit(), occasion: "x".repeat(PROTOCOL_LIMITS.occasion + 1) })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { text: "x".repeat(PROTOCOL_LIMITS.configString + 1) } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { list: new Array(PROTOCOL_LIMITS.configArrayLength + 1).fill(null) } })).toBe(false);
    let nested: unknown = "too deep";
    for (let index = 0; index < PROTOCOL_LIMITS.configDepth + 1; index += 1) nested = { nested };
    expect(isHostToFrameMessage({ ...validInit(), config: { nested } })).toBe(false);
    expect(isFrameToHostMessage({ v: 1, type: "error", code: "X", message: "x".repeat(PROTOCOL_LIMITS.errorMessage + 1) })).toBe(false);
  });

  it("rejects markup-shaped strings and unsafe CSS tokens", () => {
    expect(isHostToFrameMessage({ ...validInit(), config: { text: "<img src=x onerror=alert(1)>" } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), config: { text: "javascript:alert(1)" } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), theme: { "--exp-bg": "red; display: none" } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), theme: { "--exp-bg": "url(https://evil.invalid)" } })).toBe(false);
    expect(isHostToFrameMessage({ ...validInit(), theme: { "--not-allowed": "red" } })).toBe(false);
  });

  it("rejects prototype-pollution keys without modifying object prototypes", () => {
    // JSON.parse creates an own __proto__ key; it must not be treated as a
    // prototype mutation or accepted as configuration data.
    const parsed = JSON.parse(JSON.stringify(validInit()).replace(
      '"config":{',
      '"config":{"__proto__":{"polluted":true},',
    ));
    expect(isHostToFrameMessage(parsed)).toBe(false);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();

    const direct = validInit() as unknown as Record<string, unknown>;
    direct.__proto__ = { polluted: true };
    expect(isHostToFrameMessage(direct)).toBe(false);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();

    const withConstructor = validInit();
    withConstructor.config.constructor = { prototype: { polluted: true } };
    expect(isHostToFrameMessage(withConstructor)).toBe(false);
  });

  it("does not throw for hostile proxy input", () => {
    const proxy = new Proxy({}, { get() { throw new Error("no access"); } });
    expect(isHostToFrameMessage(proxy)).toBe(false);
    expect(isFrameToHostMessage(proxy)).toBe(false);
  });
});
