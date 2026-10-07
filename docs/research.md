# Handwriting rendering research

## Font-based app inspected

[Text to Handwriting](https://saurabhdaware.github.io/text-to-handwriting/) ([source](https://github.com/saurabhdaware/text-to-handwriting)) is MIT licensed and archived.

The source confirms there is no handwriting AI model:

- [`helpers.mjs`](https://github.com/saurabhdaware/text-to-handwriting/blob/master/js/utils/helpers.mjs) reads uploaded font bytes, creates `new FontFace('temp-font', bytes)`, waits for `.load()`, adds the result to `document.fonts`, and sets the page's CSS `fontFamily`.
- [`index.css`](https://github.com/saurabhdaware/text-to-handwriting/blob/master/css/index.css) sets a 400 px wide A4-ratio page, a handwriting family, and blue ink `#000f55`. Spacing and margins are CSS settings.
- [`generate-images.mjs`](https://github.com/saurabhdaware/text-to-handwriting/blob/master/js/generate-images.mjs) captures the styled page with html2canvas. Scanner mode adjusts image contrast. Multi-page layout splits HTML on whitespace and repeatedly measures a fixed-height area.
- `createPDF` in helpers places captured images in jsPDF. It is a raster PDF, not text/stroke synthesis.

Important for lab programs: `formatText` explicitly replaces every newline with a space on paste. Pagination splits on whitespace and joins tokens with spaces. That is not a suitable unchanged layout for Python indentation and source line preservation. The app's FAQ also acknowledges gaps between letters in custom fonts.

The custom-font concept is valid for this project. Our implementation uses FontFace for displaying the uploaded font, and opentype.js for vector glyph paths, with a dedicated fixed-column code layout.

## Alternative projects

- [Tegaki](https://github.com/gkurt/tegaki): MIT. Font-to-stroke rendering and animation, variation/pressure/taper plugins, SVG export. Promising if animated strokes are required. Font-based static output still needs visual assessment and complete glyph coverage.
- [handwritten.js](https://github.com/alias-rahil/handwritten.js): MIT. Six image variants per printable ASCII character, supports blue ink. Source confirms full programming punctuation but replaces tabs with single spaces and uses legacy raster/layout dependencies. A glyph-variant approach is useful inspiration; layout cannot be reused unchanged.
- [sjvasquez/handwriting-synthesis](https://github.com/sjvasquez/handwriting-synthesis): neural text-to-stroke reference with included pretrained weights. `drawing.py` has a restricted alphabet missing `_`, `=`, `+`, `*`, `/`, and square/curly brackets. `demo.py` caps lines at 75 characters. No explicit license was confirmed. Not an appropriate general code renderer.
- [Longhand](https://github.com/tmarkovski/longhand): TypeScript client-side neural inference and vector pen rendering. README states code license is not yet chosen and both weight sets are unlicensed development assets. Do not bundle or redistribute without permission/clear licensing.
- [OmarMusayev/ai-handwriting-generator](https://github.com/OmarMusayev/ai-handwriting-generator): MIT application code, Python/PyTorch LSTM and Transformer models with included weights. A possible future experimental neural backend, subject to model/data terms and code-character accuracy validation.
- [handlatex](https://github.com/DavideFauri/handlatex): GPLv2 LaTeX/Python tool for randomized text layout, requires TeX and a separate handwriting font.

## Maths

[MathJax font documentation](https://docs.mathjax.org/en/latest/output/fonts.html#font-extensions) lists its Euler extension. [CTAN Euler](https://ctan.org/pkg/euler) describes the underlying design as capturing the flavour of maths written by a mathematician with excellent handwriting.

Euler provides a handwriting-influenced designed style, not actual handwritten stroke synthesis. The MathJax extension overlays available glyphs on a base font; not all variants/symbols become Euler. SVG math preserves two-dimensional equation structure and remains sharp in PDF.

## Decision

Use a local, deterministic font-to-vector implementation first. Keep code symbols and indentation exact; fail visibly on missing characters. Load maths separately and export page-sized vectors. Do not imply that this recreates Deepscribble's exact pen shapes, contextual cursive connections, or proprietary engine. Visual approval and a physical test print are needed before deciding whether the current style is sufficient.
