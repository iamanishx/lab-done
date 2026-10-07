import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import type { InputMode } from "./types";

export interface Run { text: string; kind?: "math"; bold?: boolean; italic?: boolean; }
export interface Block { kind: "text" | "code" | "math" | "break" | "rule"; runs?: Run[]; text?: string; level?: number; indent?: number; }
const md = new MarkdownIt({ html: false, linkify: false, breaks: false });

md.inline.ruler.before("escape", "inline_math", (state, silent) => {
  const start = state.pos;
  const delimiter = state.src.startsWith("\\(", start) ? "\\(" : state.src[start] === "$" ? "$" : "";
  if (!delimiter || state.src.startsWith("$$", start)) return false;
  const closing = delimiter === "$" ? "$" : "\\)";
  let end = start + delimiter.length;
  while ((end = state.src.indexOf(closing, end)) !== -1 && state.src[end - 1] === "\\") end += closing.length;
  if (end < 0 || end === start + delimiter.length) return false;
  if (!silent) {
    const token = state.push("math_inline", "", 0);
    token.content = state.src.slice(start + delimiter.length, end);
  }
  state.pos = end + closing.length;
  return true;
});

function inlineRuns(tokens: Token[] = []): Run[] {
  const runs: Run[] = [];
  let bold = false, italic = false;
  for (const token of tokens) {
    if (token.type === "strong_open") bold = true;
    else if (token.type === "strong_close") bold = false;
    else if (token.type === "em_open") italic = true;
    else if (token.type === "em_close") italic = false;
    else if (token.type === "softbreak") runs.push({ text: " " });
    else if (token.type === "hardbreak") runs.push({ text: "\n" });
    else if (token.type === "image") runs.push({ text: `[Image: ${token.content}. Add diagrams separately.]` });
    else if (token.type === "math_inline") runs.push({ text: token.content, kind: "math" });
    else if (token.nesting === 0) runs.push({ text: token.content, bold, italic });
  }
  return runs;
}

export function parseMarkdown(source: string): Block[] {
  // Display math is split out before Markdown, but never from fenced code.
  const chunks: { text: string; math?: boolean; pageBreak?: boolean }[] = [];
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  let buffer: string[] = [], math: string[] | null = null, fence = "";
  const flush = () => { if (buffer.length) chunks.push({ text: buffer.join("\n") }); buffer = []; };
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(`{3,}|~{3,})/);
    if (!math && match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = "";
      buffer.push(line); continue;
    }
    if (!fence && (trimmed === "<!-- pagebreak -->" || trimmed === "\\newpage")) {
      flush(); chunks.push({ text: "", pageBreak: true }); continue;
    }
    if (!fence && (trimmed === "$$" || trimmed === "\\[" || trimmed === "\\]")) {
      if (math) { chunks.push({ text: math.join("\n"), math: true }); math = null; }
      else { flush(); math = []; }
      continue;
    }
    if (!fence && !math && trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
      flush(); chunks.push({ text: trimmed.slice(2, -2), math: true }); continue;
    }
    if (math) math.push(line); else buffer.push(line);
  }
  if (math) throw new Error("Unclosed display equation. Add a closing $$ or \\].");
  flush();
  const blocks: Block[] = [];
  for (const chunk of chunks) {
    if (chunk.math) { blocks.push({ kind: "math", text: chunk.text }); continue; }
    if (chunk.pageBreak) { blocks.push({ kind: "break" }); continue; }
    const tokens = md.parse(chunk.text, {});
    let heading = 0, depth = 0, inItem = false, ordered = false, number = 1;
    let tableRow: Run[] | null = null;
    for (const token of tokens) {
      if (token.type === "heading_open") heading = Number(token.tag.slice(1));
      else if (token.type === "heading_close") heading = 0;
      else if (token.type === "bullet_list_open" || token.type === "ordered_list_open") { depth++; ordered = token.type === "ordered_list_open"; number = Number(token.attrGet("start") ?? 1); }
      else if (token.type === "bullet_list_close" || token.type === "ordered_list_close") depth--;
      else if (token.type === "list_item_open") inItem = true;
      else if (token.type === "tr_open") tableRow = [];
      else if (token.type === "tr_close" && tableRow) { blocks.push({ kind: "text", runs: tableRow }); tableRow = null; }
      else if (token.type === "inline") {
        const runs = inlineRuns(token.children ?? []);
        if (tableRow) { if (tableRow.length) tableRow.push({ text: "    |    " }); tableRow.push(...runs); }
        else {
          if (inItem) { runs.unshift({ text: ordered ? `${number++}. ` : "• " }); inItem = false; }
          blocks.push({ kind: "text", runs, level: heading, indent: Math.max(0, depth - 1) * 16 });
        }
      } else if (token.type === "fence" || token.type === "code_block") blocks.push({ kind: "code", text: token.content.replace(/\n$/, "") });
      else if (token.type === "hr") blocks.push({ kind: "rule" });
    }
  }
  return blocks;
}

export function parseSource(source: string, mode: InputMode): Block[] {
  if (mode === "python") return [{ kind: "code", text: source }];
  if (mode === "latex") {
    // This is a small LaTeX-content subset, not a full TeX compiler.
    source = source
      .replace(/\\(?:sub)*section\*?\{([^{}]*)\}/g, "## $1")
      .replace(/\\textbf\{([^{}]*)\}/g, "**$1**")
      .replace(/\\textit\{([^{}]*)\}/g, "*$1*")
      .replace(/\\begin\{(?:equation\*?|align\*?)\}/g, "\n$$\n")
      .replace(/\\end\{(?:equation\*?|align\*?)\}/g, "\n$$\n")
      .replace(/\\begin\{(?:verbatim|lstlisting)\}(?:\[[^\]]*\])?/g, "\n```python\n")
      .replace(/\\end\{(?:verbatim|lstlisting)\}/g, "\n```\n");
    if (/\\(?:documentclass|usepackage)|\\begin\{document\}/.test(source)) throw new Error("Full .tex documents are not supported. Paste the body text, code, and equations instead.");
  }
  return parseMarkdown(source);
}
