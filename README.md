# Lab done

A browser-only lab-record formatter: paste Python, Markdown, or a supported LaTeX body and export white pages in blue handwriting-style ink. Output printouts are separate black monospace pages.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173. Build with `npm run build`, test with `npm test`.

## Your lab workflow

1. Paste raw code under **Python**, or use fenced code blocks inside **Markdown**.
2. Choose a handwriting font, paper dimensions, margins, size, and spacing.
3. Download the vector PDF or use Print. Print at **100% scale**, with browser headers/footers disabled. Turn printed rules off on pre-ruled paper.
4. Save the `.py` source and execute it with your own local Python environment.
5. Paste real terminal output into **Output printout**, then print/download it separately to attach to your record.

The browser does not execute uploaded Python. There is no AI model, inference service, telemetry, or remote agent.

### Included real example

`examples/distance_measures.py` contains the supplied Iris distance-measures program. Its actual transcript is `examples/distance_output.txt`. It was captured with NumPy 2.5.2 and scikit-learn 1.9.0, using inputs **0, 1, 7, 8**: select samples 0 and 1, calculate all distances, exit. It is explicitly example output, not output generated from whatever code you subsequently paste.

To reproduce (use an environment with NumPy and scikit-learn installed):

```bash
python3 scripts/capture_example.py
```

For interactive execution:

```bash
python3 examples/distance_measures.py
```

## Custom handwriting

Create a font using your own written alphabet, for example with [Calligraphr](https://www.calligraphr.com/), then click **Upload handwriting font**. Supports `.ttf`, `.otf`, and uncompressed `.woff`, up to 5 MB. Fonts are read locally and stay in memory until refresh; re-upload after reloading.

Your font must contain the symbols your document needs. For Python, include letters, numbers, quotes, parentheses, brackets, braces, underscore, backslash, colon, and arithmetic/comparison operators. Missing glyphs produce a visible error rather than being silently removed. Creating a font captures your letter shapes; it does not reproduce contextual cursive joins or neural pen-stroke synthesis.

## Rendering

- React + TypeScript + Vite for the interface.
- `markdown-it` for document parsing. Raw Python bypasses Markdown entirely.
- `opentype.js` turns font glyphs into vector paths. Code uses fixed cells, four-column tab stops, and whole-block width fitting to preserve indentation and source line breaks.
- **Mynerve** is the default for new documents; **Gloria Hallelujah** is also bundled. Additional options: Handlee, Reenie Beanie, Edu NSW ACT Foundation, Patrick Hand, Kalam, Caveat. Existing saved font selections are preserved. Mynerve variation uses real `.alt` outlines for Latin letters, deterministic selection and no consecutive reuse of the same variant for a given letter; this is a custom alternate-selection strategy, not a full OpenType shaping engine. Operators remain canonical.
- Optional **seeded** small position/angle/scale variation. Preview and export stay identical. This is font-based handwriting, not an AI-generated replica.
- MathJax SVG with its Euler font extension for equations; uncovered math variants/symbols use the base math font. Maths remains designed typography, not natural pen strokes.
- `svg2pdf.js` + jsPDF creates a page-sized **vector PDF** from the same SVG shapes used in the preview. No screenshot stretching.
- Fonts are locally bundled. Math rendering is loaded only when needed. Drafts are saved in browser localStorage where available; this is not encrypted storage.

## Input support and limits

- Markdown headings, emphasis, lists, paragraphs, fenced code, and simple tables. Tables render as text rows separated with `|`, not a full grid layout.
- Inline maths: `$x_i$` or `\(x_i\)`.
- Display maths: `$$` on separate lines, or `\[` / `\]` on separate lines. MathJax base and AMS commands support fractions, roots, Greek letters, and matrices.
- Manual page break: `<!-- pagebreak -->` or `\newpage`.
- **LaTeX body** is a small conversion subset: section/subsection, textbf/textit, equation/align, verbatim/lstlisting. It is not a full `.tex` compiler. Full document preambles are rejected. For reliably aligned multi-line math, use `\begin{aligned}...\end{aligned}` inside display delimiters.
- Embedded images are not rendered; add diagrams/photos separately.
- Long source lines shrink the entire code block, with warnings. The app never rewrites your code to fit.
- Input limit: 150,000 characters. Very large vector documents can take longer to render/export.
- Built-in glyph sets are Latin-focused. Custom fonts can extend coverage.

Use handwriting-style printouts only when permitted by your lab's submission rules.

## Design and research references

UI colors and typography follow `/home/mbxd/projects/cuTe/cute-lrn/.agents/frontend_skills.md`: warm paper, dark ink, green accents, Source Serif 4 and IBM Plex Mono. Blue is reserved for the required pen output.

Inspected [Saurabh Daware's text-to-handwriting](https://github.com/saurabhdaware/text-to-handwriting), MIT licensed:

- `js/utils/helpers.mjs`: uploads font bytes with `FontFace`; paste handling replaces newlines with spaces.
- `js/generate-images.mjs`: captures styled HTML using html2canvas and paginates via whitespace splitting.
- `css/index.css`: handwriting font and blue ink applied to an A4-ratio HTML container.
- PDF generation places page images in jsPDF.

This app uses the same general custom-font concept but implements its own code-preserving SVG renderer. No upstream application code was copied. See `docs/research.md` for renderer tradeoffs.

## Verification

- `npm test`: parsing, code line preservation, deterministic output, all three fonts' Python punctuation, missing-glyph errors, output formatting and paper dimensions.
- Browser checks: supplied 176-line code matches rendered line metadata exactly; five A4 pages with no vector content overflowing page bounds in Patrick Hand, Kalam, Caveat, Mynerve and Gloria Hallelujah; Markdown/math preview; mobile layout at 390 px. All eight picker fonts pass Python punctuation tests.
- Export checks with `pdfinfo` confirm five A4 pages and no PDF JavaScript. Examples: `examples/distance-mynerve.pdf` (about 2.7 MB), `examples/distance-gloria.pdf` (about 2.4 MB), and `examples/distance-handwriting.pdf` (Patrick Hand, about 1 MB). `examples/distance-output.pdf` contains two output pages.
- `npm audit`: zero known vulnerabilities at implementation time.
