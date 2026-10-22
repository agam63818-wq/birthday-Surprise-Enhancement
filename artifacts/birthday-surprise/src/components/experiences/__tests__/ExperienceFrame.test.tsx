// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExperienceFrame, { READY_TIMEOUT_MS, type ExperienceFrameProps } from "@/components/experiences/ExperienceFrame";

function emitFrameMessage(iframe: HTMLIFrameElement, data: unknown, source: Window | null = iframe.contentWindow) {
  const event = new MessageEvent("message", { data, source });
  act(() => {
    window.dispatchEvent(event);
  });
}

function renderFrame(overrides: Partial<ExperienceFrameProps> = {}) {
  const onNext = vi.fn();
  const props: ExperienceFrameProps = {
    experience: "love-drive",
    config: { objective: "Find surprises" },
    theme: { "--exp-accent": "#ff6b9d" },
    occasion: "birthday",
    onNext,
    ...overrides,
  };
  const view = render(<ExperienceFrame {...props} />);
  const iframe = view.container.querySelector("iframe") as HTMLIFrameElement;
  const target = iframe.contentWindow as Window;
  const postMessage = vi.spyOn(target, "postMessage").mockImplementation(() => undefined);
  return { ...view, iframe, target, postMessage, onNext, props };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ExperienceFrame", () => {
  it("uses an isolated iframe, waits for ready, then sends one validated init", () => {
    const frame = renderFrame({ globalMuted: false, reducedMotion: true });
    expect(frame.iframe.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.iframe.getAttribute("src")).toBe("/experiences/love-drive/index.html");
    expect(frame.iframe.getAttribute("title")).toBe("Love Drive interactive experience");
    expect(screen.getByRole("status")).toBeTruthy();

    emitFrameMessage(frame.iframe, { v: 1, type: "ready" });
    expect(frame.postMessage).toHaveBeenCalledTimes(1);
    expect(frame.postMessage.mock.calls[0][0]).toMatchObject({
      v: 1,
      type: "init",
      experience: "love-drive",
      config: { objective: "Find surprises" },
      muted: false,
      reducedMotion: true,
      occasion: "birthday",
    });
    expect(frame.postMessage.mock.calls[0][1]).toBe("*");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("accepts next only from its own iframe and advances at most once", () => {
    const frame = renderFrame();
    emitFrameMessage(frame.iframe, { v: 1, type: "ready" });
    emitFrameMessage(frame.iframe, { v: 1, type: "next" }, null);
    expect(frame.onNext).not.toHaveBeenCalled();
    emitFrameMessage(frame.iframe, { v: 1, type: "next", extra: true });
    expect(frame.onNext).not.toHaveBeenCalled();
    emitFrameMessage(frame.iframe, { v: 1, type: "next" });
    emitFrameMessage(frame.iframe, { v: 1, type: "next" });
    emitFrameMessage(frame.iframe, { v: 1, type: "complete" });
    expect(frame.onNext).toHaveBeenCalledTimes(1);
  });

  it("reports complete without auto-advancing by default", () => {
    const onComplete = vi.fn();
    const frame = renderFrame({ onComplete });
    emitFrameMessage(frame.iframe, { v: 1, type: "ready" });
    emitFrameMessage(frame.iframe, { v: 1, type: "complete" });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(frame.onNext).not.toHaveBeenCalled();
  });

  it("pauses/resumes on active changes and sends updates without reloading", () => {
    const frame = renderFrame({ isActive: true, globalMuted: true });
    emitFrameMessage(frame.iframe, { v: 1, type: "ready" });
    const originalIframe = frame.iframe;
    frame.postMessage.mockClear();

    frame.rerender(<ExperienceFrame {...frame.props} isActive={false} globalMuted={false} reducedMotion />);
    expect(frame.postMessage.mock.calls.some(([message]) => message.type === "pause")).toBe(true);
    expect(frame.postMessage.mock.calls.some(([message]) => message.type === "update" && message.muted === false && message.reducedMotion === true)).toBe(true);
    expect(frame.container.querySelector("iframe")).toBe(originalIframe);

    frame.postMessage.mockClear();
    frame.rerender(<ExperienceFrame {...frame.props} isActive />);
    expect(frame.postMessage.mock.calls.some(([message]) => message.type === "resume")).toBe(true);
    expect(frame.container.querySelector("iframe")).toBe(originalIframe);
  });

  it("sends replay on a token change while preserving the same iframe", () => {
    const frame = renderFrame({ replayToken: 0 });
    emitFrameMessage(frame.iframe, { v: 1, type: "ready" });
    const originalIframe = frame.iframe;
    frame.postMessage.mockClear();
    frame.rerender(<ExperienceFrame {...frame.props} replayToken={1} />);
    expect(frame.postMessage.mock.calls.some(([message]) => message.type === "replay")).toBe(true);
    expect(frame.container.querySelector("iframe")).toBe(originalIframe);
  });

  it("shows a recoverable ready-timeout error with Retry and Skip scene", () => {
    vi.useFakeTimers();
    const frame = renderFrame();
    act(() => {
      vi.advanceTimersByTime(READY_TIMEOUT_MS);
    });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    screen.getByRole("button", { name: "Skip scene" }).click();
    expect(frame.onNext).toHaveBeenCalledTimes(1);
  });

  it("retry replaces only the failed frame and returns to loading", () => {
    vi.useFakeTimers();
    const frame = renderFrame();
    const originalIframe = frame.iframe;
    act(() => {
      vi.advanceTimersByTime(READY_TIMEOUT_MS);
    });
    act(() => {
      screen.getByRole("button", { name: "Retry" }).click();
    });
    expect(frame.container.querySelector("iframe")).not.toBe(originalIframe);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
    expect(frame.onNext).not.toHaveBeenCalled();
  });
});
