// @vitest-environment jsdom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import defaultConfig from "@/config";
import StickerLayer from "@/components/stickers/StickerLayer";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { STICKERS_BY_ID } from "@/lib/stickers/manifest";
import { createSeededStickerFixture } from "@/lib/stickers/__tests__/fixtures";
import type { SurpriseConfig } from "@/lib/v2/schema";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StickerLayer component", () => {
  it("renders N decorative imgs positioned in %, preserves manifest aspect ratio, and skips unknown stickerIds", () => {
    const config: SurpriseConfig = {
      ...createSeededStickerFixture("v2"),
      stickers: {
        version: 1,
        scenes: {
          intro: {
            enabled: true,
            items: [
              {
                uid: "s-back",
                stickerId: "kitty-02",
                x: 0.25,
                y: 0.4,
                w: 0.2,
                rotate: -15,
                z: 1,
              },
              {
                uid: "s-unknown",
                stickerId: "kitty-missing-999",
                x: 0.5,
                y: 0.5,
                w: 0.2,
                rotate: 0,
                z: 2,
              },
              {
                uid: "s-front",
                stickerId: "kitty-22",
                x: 0.75,
                y: 0.8,
                w: 0.15,
                rotate: 20,
                z: 4,
                flipX: true,
              },
            ],
          },
        },
      },
    };

    const { container } = render(
      <ConfigProvider config={config}>
        <StickerLayer sceneKey="intro" reducedMotion={false} />
      </ConfigProvider>,
    );

    const layer = container.querySelector(".sticker-layer") as HTMLElement | null;
    expect(layer).not.toBeNull();
    expect(layer?.style.position).toBe("absolute");
    expect(layer?.style.inset).toBe("0px");
    expect(layer?.style.pointerEvents).toBe("none");

    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(2);

    const [first, second] = imgs;
    expect(first.getAttribute("src")).toBe(STICKERS_BY_ID["kitty-02"].webp);
    expect(first.getAttribute("alt")).toBe("");
    expect(first.getAttribute("aria-hidden")).toBe("true");
    expect(first.getAttribute("decoding")).toBe("async");
    expect(first.draggable).toBe(false);
    expect(first.style.left).toBe("25%");
    expect(first.style.top).toBe("40%");
    expect(first.style.width).toBe("20%");
    expect(first.style.aspectRatio).toContain(String(STICKERS_BY_ID["kitty-02"].aspect));
    expect(first.style.transform).toBe("translate(-50%, -50%) rotate(-15deg)");
    expect(first.style.zIndex).toBe("1");

    expect(second.getAttribute("src")).toBe(STICKERS_BY_ID["kitty-22"].webp);
    expect(second.style.left).toBe("75%");
    expect(second.style.top).toBe("80%");
    expect(second.style.width).toBe("15%");
    expect(second.style.transform).toBe("translate(-50%, -50%) rotate(20deg) scaleX(-1)");
    expect(second.style.zIndex).toBe("4");
  });

  it("renders nothing when scene stickers are disabled or absent", () => {
    const disabledConfig: SurpriseConfig = {
      ...(structuredClone(defaultConfig) as SurpriseConfig),
      stickers: {
        version: 1,
        scenes: {
          intro: {
            enabled: false,
            items: [
              { uid: "hidden-1", stickerId: "kitty-01", x: 0.5, y: 0.5, w: 0.2, rotate: 0, z: 0 },
            ],
          },
        },
      },
    };

    const { container: disabledContainer } = render(
      <ConfigProvider config={disabledConfig}>
        <StickerLayer sceneKey="intro" />
      </ConfigProvider>,
    );
    expect(disabledContainer.firstChild).toBeNull();

    const { container: legacyContainer } = render(
      <ConfigProvider config={defaultConfig as SurpriseConfig}>
        <StickerLayer sceneKey="intro" />
      </ConfigProvider>,
    );
    expect(legacyContainer.firstChild).toBeNull();
  });

  it("switches to static first-frame poster PNG when prefers-reduced-motion is active", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const seeded = createSeededStickerFixture("v2");
    const { container } = render(
      <ConfigProvider config={seeded}>
        <StickerLayer sceneKey="intro" />
      </ConfigProvider>,
    );

    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute("src")).toBe(STICKERS_BY_ID["kitty-02"].poster);
    expect(imgs[1].getAttribute("src")).toBe(STICKERS_BY_ID["kitty-22"].poster);
    expect(imgs[0].className).not.toContain("sticker-layer-item--fade");
  });

  it("preserves exact DOM img nodes without remounting on unrelated config updates", () => {
    const initial = createSeededStickerFixture("v2");
    const { container, rerender } = render(
      <ConfigProvider config={initial}>
        <StickerLayer sceneKey="intro" reducedMotion={false} />
      </ConfigProvider>,
    );

    const beforeNodes = Array.from(container.querySelectorAll("img"));
    expect(beforeNodes).toHaveLength(2);

    // Update unrelated recipient name and another scene's stickers
    const updatedOtherState: SurpriseConfig = {
      ...structuredClone(initial),
      name: "Updated Name Without Remounting Intro Stickers",
      stickers: {
        version: 1,
        scenes: {
          ...initial.stickers?.scenes,
          celebration: {
            enabled: true,
            items: [
              { uid: "new-cel", stickerId: "kitty-19", x: 0.3, y: 0.3, w: 0.25, rotate: 5, z: 1 },
            ],
          },
        },
      },
    };

    rerender(
      <ConfigProvider config={updatedOtherState}>
        <StickerLayer sceneKey="intro" reducedMotion={false} />
      </ConfigProvider>,
    );

    const afterNodes = Array.from(container.querySelectorAll("img"));
    expect(afterNodes).toHaveLength(2);
    expect(afterNodes[0]).toBe(beforeNodes[0]);
    expect(afterNodes[1]).toBe(beforeNodes[1]);
  });

  it("exposes selection outline & handles ONLY in editable mode and commits drag once on pointerup", () => {
    const seeded = createSeededStickerFixture("v2");
    const onCommit = vi.fn();
    const onSelect = vi.fn();

    const { container } = render(
      <ConfigProvider config={seeded}>
        <StickerLayer
          sceneKey="intro"
          reducedMotion
          editable
          selectedUid="fix-intro-1"
          onSelectUid={onSelect}
          onCommitPlacement={onCommit}
        />
      </ConfigProvider>,
    );

    const layer = container.querySelector(".sticker-layer--editable") as HTMLElement;
    vi.spyOn(layer, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 390,
      height: 660,
      right: 390,
      bottom: 660,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const selected = container.querySelector('[data-sticker-uid="fix-intro-1"]') as HTMLElement;
    const unselected = container.querySelector('[data-sticker-uid="fix-intro-2"]') as HTMLElement;

    // Only selected sticker has touch-action: none and handles; unselected permits vertical scroll
    expect(selected.style.touchAction).toBe("none");
    expect(unselected.style.touchAction).toBe("pan-y");
    expect(selected.querySelector(".sticker-editor-outline")).not.toBeNull();
    expect(unselected.querySelector(".sticker-editor-outline")).toBeNull();

    // Pointer drag updates DOM inline without calling onCommit until pointerup
    selected.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, clientX: 70, clientY: 165 }));
    selected.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, clientX: 109, clientY: 231 }));
    expect(onCommit).toHaveBeenCalledTimes(0);

    selected.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, clientX: 109, clientY: 231 }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0]).toBe("fix-intro-1");
    expect(onCommit.mock.calls[0][1].x).toBeCloseTo(0.28, 2);
    expect(onCommit.mock.calls[0][1].y).toBeCloseTo(0.35, 2);
  });
});
