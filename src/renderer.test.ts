import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { DEFAULT_SETTINGS, FONT_OPTIONS } from "./types";
import { expandTabs, renderPages } from "./renderer";
import { PYTHON_SAMPLE, OUTPUT_SAMPLE } from "./sample";

beforeEach(() => {
  vi.stubGlobal("fetch", async (url: string) => {
    const relative = decodeURIComponent(url.split("?")[0].replace(/^\//, ""));
    const path = relative.startsWith("fonts/") ? `public/${relative}` : relative;
    const buffer = await readFile(path);
    return { ok: true, arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("vector page renderer", () => {
  it("expands tabs to tab stops, not one space", () => {
    expect(expandTabs("\tx\nabc\ty\nx\tz")).toBe("    x\nabc y\nx   z");
  });
  it("renders every line of the supplied Python program once", async () => {
    const result = await renderPages(PYTHON_SAMPLE, "python", DEFAULT_SETTINGS);
    expect(result.pages.length).toBeGreaterThan(1);
    const count = result.pages.reduce((total, page) => total + [...page.svg.matchAll(/class="code-line"/g)].length, 0);
    expect(count).toBe(PYTHON_SAMPLE.split("\n").length);
    expect(result.pages[0].svg).toContain("#234c9b");
    expect(result.pages[0].svg).not.toContain("<image");
    expect(result.pages[0].svg).toContain("viewBox=");
  });
  it("renders deterministically for preview/export consistency", async () => {
    const code = 'return np.sum(a[0] ** 2) / b';
    const first = await renderPages(code, "python", DEFAULT_SETTINGS);
    const second = await renderPages(code, "python", DEFAULT_SETTINGS);
    expect(first).toEqual(second);
  });
  it("supports Python punctuation in every bundled font", async () => {
    for (const [font] of FONT_OPTIONS) {
      const result = await renderPages('x_1 = a[0] ** 2 + f"{b}" / (c - 1) # comment', "python", { ...DEFAULT_SETTINGS, font });
      expect(result.pages).toHaveLength(1);
    }
  });
  it("uses actual Mynerve letter alternates when variation is enabled", async () => {
    const enabled = await renderPages("aaaaaaaaaaaa", "python", { ...DEFAULT_SETTINGS, font: "mynerve", variation: true });
    const disabled = await renderPages("aaaaaaaaaaaa", "python", { ...DEFAULT_SETTINGS, font: "mynerve", variation: false });
    const paths = (svg: string) => [...svg.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(paths(enabled.pages[0].svg)).size).toBeGreaterThan(new Set(paths(disabled.pages[0].svg)).size);
  });
  it("prints actual output in black, without ruled decoration", async () => {
    const result = await renderPages(OUTPUT_SAMPLE, "python", { ...DEFAULT_SETTINGS, ruled: true }, true);
    expect(result.pages[0].svg).toContain("#1d1a15");
    expect(result.pages[0].svg).not.toContain("#dcd4c1");
  });
  it("rejects missing glyphs instead of silently dropping content", async () => {
    await expect(renderPages("hello 🐍", "python", DEFAULT_SETTINGS)).rejects.toThrow("lacks these characters");
  });
  it("honors explicit page breaks and paper dimensions", async () => {
    const result = await renderPages("First\n\n<!-- pagebreak -->\n\nSecond", "markdown", { ...DEFAULT_SETTINGS, width: 180, height: 240 });
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].svg).toContain('width="180mm" height="240mm"');
  });
});
