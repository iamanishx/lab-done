import * as opentype from "opentype.js";
import type { Font } from "opentype.js";
import patrickUrl from "@fontsource/patrick-hand/files/patrick-hand-latin-400-normal.woff?url";
import kalamUrl from "@fontsource/kalam/files/kalam-latin-400-normal.woff?url";
import caveatUrl from "@fontsource/caveat/files/caveat-latin-400-normal.woff?url";
import monoUrl from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff?url";
import { parseSource } from "./markdown";
import type { Run } from "./markdown";
import type { InputMode, Settings } from "./types";

export const MM = 96 / 25.4;
export interface RenderedPage { svg: string; }
export interface RenderResult { pages: RenderedPage[]; warnings: string[]; }
const urls = {
  mynerve: "/fonts/mynerve/Mynerve-Regular.ttf", handlee: "/fonts/handlee/Handlee-Regular.ttf",
  reenie: "/fonts/reeniebeanie/ReenieBeanie.ttf", edu: "/fonts/edunswactfoundation/EduNSWACTFoundation%5Bwght%5D.ttf",
  gloria: "/fonts/gloriahallelujah/GloriaHallelujah.ttf",
  patrick: patrickUrl, kalam: kalamUrl, caveat: caveatUrl, mono: monoUrl,
};
const fonts = new Map<string, Promise<Font>>();
let customFont: Font | undefined;
export function setCustomFont(buffer: ArrayBuffer) {
  const font = opentype.parse(buffer);
  if (!font.unitsPerEm || !font.glyphs.length) throw new Error("This font has no usable glyphs.");
  customFont = font;
}
export function loadFont(name: keyof typeof urls | "custom"): Promise<Font> {
  if (name === "custom") return customFont ? Promise.resolve(customFont) : Promise.reject(new Error("Upload your handwriting font first."));
  if (!fonts.has(name)) fonts.set(name, fetch(urls[name]).then(response => {
    if (!response.ok) throw new Error("Could not load the bundled handwriting font.");
    return response.arrayBuffer();
  }).then(buffer => opentype.parse(buffer)));
  return fonts.get(name)!;
}
export function escapeXml(text: string) { return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
export function expandTabs(text: string, size = 4) {
  let column = 0, out = "";
  for (const char of text) {
    if (char === "\t") { const spaces = size - column % size; out += " ".repeat(spaces); column += spaces; }
    else { out += char; column = char === "\n" ? 0 : column + 1; }
  }
  return out;
}
function jitter(seed: number) {
  let x = (seed + 1) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967295 - 0.5;
}

export async function renderPages(source: string, mode: InputMode, settings: Settings, output = false): Promise<RenderResult> {
  const font = await loadFont(output ? "mono" : settings.font);
  const blocks = output ? [{ kind: "code" as const, text: source }] : parseSource(source, mode);
  const needsMath = blocks.some(block => block.kind === "math" || block.runs?.some(run => run.kind === "math"));
  const renderEquation = needsMath ? (await import("./math")).renderEquation : undefined;
  const width = settings.width * MM, height = settings.height * MM, margin = settings.margin * MM;
  const contentWidth = width - margin * 2, bottom = height - margin;
  const size = output ? 13 : settings.fontSize;
  const lineHeight = output ? 19 : size * settings.lineHeight;
  const ink = output ? "#1d1a15" : settings.ink;
  const pageParts: string[][] = [[]];
  const warnings = new Set<string>();
  let y = margin, glyphIndex = 0;
  const missing = new Set<string>();
  // Use Mynerve's real alternate outlines, not just a rotated copy of one shape.
  // Keep code operators in their canonical shapes and all cells at fixed advances.
  const variants = new Map<string, opentype.Glyph[]>();
  if (!output && settings.font === "mynerve" && settings.variation) {
    for (let i = 0; i < font.glyphs.length; i++) {
      const glyph = font.glyphs.get(i);
      const match = glyph.name?.match(/^([a-zA-Z])\.alt\d+$/);
      if (!match) continue;
      const list = variants.get(match[1]) ?? [font.charToGlyph(match[1])];
      list.push(glyph); variants.set(match[1], list);
    }
  }
  const previousVariants = new Map<string, number>();
  const parts = () => pageParts[pageParts.length - 1];
  const newPage = () => { if (parts().length) pageParts.push([]); y = margin; };
  const ensure = (h: number) => { if (y + h > bottom + 0.01 && parts().length) newPage(); };
  const drawText = (text: string, x: number, baseline: number, fontSize: number, fixed = false, run: Run = { text }) => {
    const result: string[] = [];
    const cell = fontSize * (output ? 0.6 : 0.55);
    for (const char of text) {
      const baseGlyph = font.charToGlyph(char);
      const options = variants.get(char);
      let variantIndex = options ? Math.floor((jitter(glyphIndex + 511) + 0.5) * options.length) % options.length : 0;
      if (options && previousVariants.get(char) === variantIndex) variantIndex = (variantIndex + 1) % options.length;
      if (options) previousVariants.set(char, variantIndex);
      const glyph = options ? options[variantIndex] : baseGlyph;
      if (glyph.index === 0 && !/\s/.test(char)) missing.add(char);
      const advance = fixed ? cell : (baseGlyph.advanceWidth ?? font.unitsPerEm * 0.5) / font.unitsPerEm * fontSize;
      if (!/\s/.test(char)) {
        const natural = !output && settings.variation;
        const dx = natural ? jitter(glyphIndex + 77) * 0.35 : 0;
        const dy = natural ? jitter(glyphIndex + 811) * 0.6 : 0;
        const angle = natural ? jitter(glyphIndex + 317) * 2 : 0;
        const scale = natural ? 1 + jitter(glyphIndex + 991) * 0.035 : 1;
        const glyphWidth = (glyph.advanceWidth ?? font.unitsPerEm * 0.5) / font.unitsPerEm * fontSize;
        // Fixed cells preserve code columns. Fit wide glyphs without moving subsequent characters.
        const sx = fixed ? Math.min(1, cell * 0.95 / glyphWidth) : 1;
        const path = glyph.getPath(0, 0, fontSize).toPathData(3);
        const weight = !output && run.bold ? ` stroke="${ink}" stroke-width="0.35" stroke-linejoin="round"` : "";
        result.push(`<g transform="translate(${(x + dx).toFixed(3)} ${(baseline + dy).toFixed(3)}) rotate(${angle.toFixed(3)}) scale(${(sx * scale).toFixed(4)} ${scale.toFixed(4)})${run.italic ? " skewX(-8)" : ""}"><path d="${path}"${weight}/></g>`);
      }
      x += advance; glyphIndex++;
    }
    return { svg: result.join(""), x };
  };
  const measure = (text: string, fontSize: number) => Array.from(text).reduce((sum, char) => sum + (font.charToGlyph(char).advanceWidth ?? font.unitsPerEm * 0.5) / font.unitsPerEm * fontSize, 0);
  const placeMath = (tex: string, x: number, top: number, fontSize: number, available: number) => {
    const math = renderEquation!(tex);
    const scale = Math.min(fontSize / 1000, available / math.width, (bottom - margin) / math.height);
    if (scale < fontSize / 1000 * 0.8) warnings.add("An equation was reduced to fit the page width.");
    return { svg: `<g color="${ink}" fill="${ink}" stroke="${ink}" transform="translate(${x} ${top}) scale(${scale})">${math.inner}</g>`, width: math.width * scale, height: math.height * scale };
  };

  for (const block of blocks) {
    if (block.kind === "break") { newPage(); continue; }
    if (block.kind === "rule") { ensure(lineHeight); parts().push(`<path d="M${margin} ${y + lineHeight / 2}H${width - margin}" fill="none" stroke="${ink}" stroke-width="0.65"/>`); y += lineHeight; continue; }
    if (block.kind === "code") {
      if (!output && settings.font === "reenie") warnings.add("Reenie Beanie looks like loose ballpoint writing but its small symbols need a test print. Mynerve or Edu is clearer for dense code.");
      const lines = expandTabs((block.text ?? "").replaceAll("\r\n", "\n")).split("\n");
      const columns = Math.max(1, ...lines.map(line => Array.from(line).length));
      const codeSize = Math.min(size, contentWidth / (columns * (output ? 0.6 : 0.55)));
      if (codeSize < size - 0.1) warnings.add(`Code fitted to ${codeSize.toFixed(1)} px to preserve long lines. Increase paper width or reduce margins for larger letters.`);
      if (codeSize < 10) warnings.add("Some code is very small. Use wider paper or split long source lines yourself before printing.");
      const leading = output ? Math.max(codeSize * 1.45, 14) : Math.max(codeSize * settings.lineHeight, 17);
      for (const line of lines) {
        ensure(leading);
        const drawn = drawText(line, margin, y + codeSize, codeSize, true);
        parts().push(`<g class="code-line" data-source="${escapeXml(line)}">${drawn.svg}</g>`);
        y += leading;
      }
      y += lineHeight * 0.3; continue;
    }
    if (block.kind === "math") {
      const math = placeMath(block.text ?? "", margin, 0, size * 1.05, contentWidth);
      const mathHeight = math.height + lineHeight * 0.5;
      ensure(mathHeight);
      const centered = placeMath(block.text ?? "", margin + (contentWidth - math.width) / 2, y, size * 1.05, contentWidth);
      parts().push(centered.svg); y += mathHeight; continue;
    }
    const level = block.level ?? 0;
    const textSize = size * (level === 1 ? 1.5 : level === 2 ? 1.22 : level ? 1.08 : 1);
    const leading = Math.max(lineHeight, textSize * 1.25);
    const indent = block.indent ?? 0;
    const start = margin + indent;
    const tokens = (block.runs ?? []).flatMap(run => run.kind === "math" ? [run] : run.text.split(/(\n|[^\S\n]+)/).filter(Boolean).map(text => ({ ...run, text })));
    let maxMathHeight = 0;
    for (const run of tokens) if (run.kind === "math") maxMathHeight = Math.max(maxMathHeight, renderEquation!(run.text).height * textSize / 1000);
    const textLeading = Math.max(leading, maxMathHeight + 6);
    if (level && y > margin) y += leading * 0.4;
    ensure(textLeading * (level ? 2 : 1));
    let x = start, lineSvg = "";
    const endLine = () => {
      parts().push(`<g class="text-line">${lineSvg}</g>`);
      y += textLeading; x = start; lineSvg = "";
    };
    for (const run of tokens) {
      if (run.text === "\n") { endLine(); ensure(textLeading); continue; }
      if (run.kind === "math") {
        const math = placeMath(run.text, 0, 0, textSize, contentWidth - indent);
        if (x + math.width > width - margin && x > start) { endLine(); ensure(textLeading); }
        lineSvg += placeMath(run.text, x, y + Math.max(0, (textLeading - math.height) / 2), textSize, contentWidth - indent).svg;
        x += math.width; continue;
      }
      if (/^\s+$/.test(run.text)) { if (x > start) x += measure(" ", textSize); continue; }
      if (x + measure(run.text, textSize) > width - margin && x > start) { endLine(); ensure(textLeading); }
      const chunks = measure(run.text, textSize) > contentWidth - indent ? Array.from(run.text) : [run.text];
      for (const chunk of chunks) {
        if (x + measure(chunk, textSize) > width - margin && x > start) { endLine(); ensure(textLeading); }
        const drawn = drawText(chunk, x, y + textSize, textSize, false, { ...run, bold: run.bold || level > 0 });
        lineSvg += drawn.svg; x = drawn.x;
      }
    }
    if (lineSvg) endLine();
    y += leading * 0.25;
  }
  if (missing.size) throw new Error(`The selected font lacks these characters: ${[...missing].join(" ")}. Choose another font. No characters have been silently removed.`);
  if (pageParts.length > 1 && !parts().length) pageParts.pop();
  const pages = pageParts.map((body, index) => {
    const decoration: string[] = [];
    if (!output && settings.ruled) for (let line = margin + size + 3; line < bottom; line += lineHeight) decoration.push(`<path d="M${margin / 2} ${line}H${width - margin / 2}" stroke="#dcd4c1" stroke-width="0.45"/>`);
    if (!output && settings.guideMargin) decoration.push(`<path d="M${margin - 8} ${margin / 2}V${height - margin / 2}" stroke="#9c3b22" stroke-opacity="0.4" stroke-width="0.7"/>`);
    if (settings.pageNumbers) decoration.push(`<g fill="${ink}">${drawText(String(index + 1), width / 2 - 4, height - margin / 2, 12, true).svg}</g>`);
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${settings.width}mm" height="${settings.height}mm" role="img" aria-label="${output ? "Output" : "Lab record"} page ${index + 1}" color="${ink}"><rect width="${width}" height="${height}" fill="#ffffff"/>${decoration.join("")}<g fill="${ink}">${body.join("")}</g></svg>` };
  });
  return { pages, warnings: [...warnings] };
}
