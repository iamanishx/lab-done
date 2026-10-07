import { describe, expect, it } from "vitest";
import { parseSource, parseMarkdown } from "./markdown";
import { renderEquation } from "./math";

describe("content preservation", () => {
  it("keeps raw Python exact", () => {
    const code = "def f(x):\n    return np.sum(x[0] ** 2) / 3\n";
    expect(parseSource(code, "python")).toEqual([{ kind: "code", text: code }]);
  });
  it("never parses equations inside code fences", () => {
    const code = 'print("$$")\n    x = a[0] ** 2';
    const blocks = parseMarkdown("```python\n" + code + "\n```");
    expect(blocks).toEqual([{ kind: "code", text: code }]);
  });
  it("parses headings, inline maths, display maths and page breaks", () => {
    const blocks = parseMarkdown("# Aim\n\nDistance $p_i-q_i$.\n\n$$\n\\frac{x}{2}\n$$\n\n<!-- pagebreak -->\n\nNext page");
    expect(blocks[0].level).toBe(1);
    expect(blocks[1].runs?.some(run => run.kind === "math")).toBe(true);
    expect(blocks.some(block => block.kind === "math")).toBe(true);
    expect(blocks.some(block => block.kind === "break")).toBe(true);
  });
  it("rejects unclosed equations", () => {
    expect(() => parseMarkdown("$$\nx + y")).toThrow("Unclosed");
  });
  it("rejects full TeX documents explicitly", () => {
    expect(() => parseSource(String.raw`\documentclass{article}`, "latex")).toThrow("Full .tex");
  });
  it("renders fractions and roots as vectors", () => {
    const math = renderEquation(String.raw`\frac{-b \pm \sqrt{b^2-4ac}}{2a}`);
    expect(math.width).toBeGreaterThan(0);
    expect(math.height).toBeGreaterThan(0);
    expect(math.inner).toContain("<path");
  });
  it("rejects unknown LaTeX commands", () => {
    expect(() => renderEquation(String.raw`\invalidcommand{a}`)).toThrow();
  });
});
