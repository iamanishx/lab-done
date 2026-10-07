import { mathjax } from "@mathjax/src/mjs/mathjax.js";
import { TeX } from "@mathjax/src/mjs/input/tex.js";
import { SVG } from "@mathjax/src/mjs/output/svg.js";
import { liteAdaptor } from "@mathjax/src/mjs/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "@mathjax/src/mjs/handlers/html.js";
import { MathJaxTexFont } from "@mathjax/mathjax-tex-font/mjs/svg.js";
import { MathJaxEulerFontExtension } from "@mathjax/mathjax-euler-font-extension/mjs/svg.js";
import "@mathjax/src/mjs/input/tex/base/BaseConfiguration.js";
import "@mathjax/src/mjs/input/tex/ams/AmsConfiguration.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
MathJaxTexFont.addExtension(MathJaxEulerFontExtension);
const document = mathjax.document("", {
  InputJax: new TeX({ packages: ["base", "ams"], maxBuffer: 10000, maxMacros: 1000 }),
  OutputJax: new SVG({ font: new MathJaxTexFont(), fontCache: "none" }),
});

export interface Equation { inner: string; width: number; height: number; descent: number; }
const cache = new Map<string, Equation>();
export function renderEquation(tex: string): Equation {
  const cached = cache.get(tex);
  if (cached) return cached;
  const result = document.convert(tex, { display: true, em: 1000, ex: 500 });
  const html = adaptor.outerHTML(result);
  if (html.includes("data-mjx-error") || html.includes("merror")) {
    throw new Error(`Invalid or unsupported LaTeX: ${tex.slice(0, 80)}`);
  }
  const svg = html.match(/<svg\b[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/);
  if (!svg) throw new Error("Could not render this equation.");
  const [x, y, width, height] = svg[1].split(/\s+/).map(Number);
  // SVG paths are vector shapes. Translation brings the viewBox into our page coordinate system.
  const equation = { inner: `<g transform="translate(${-x} ${-y})">${svg[2]}</g>`, width, height, descent: Math.max(0, y + height) };
  if (cache.size > 100) cache.clear();
  cache.set(tex, equation);
  return equation;
}
