# Local open handwriting fonts

Downloaded from the official google/fonts repository. Each family includes its original `OFL.txt` license. All six font binaries contain all 95 printable ASCII characters (U+0020 through U+007E), checked with fontTools and opentype.js.

| Family | Source | Use |
| --- | --- | --- |
| Mynerve | https://github.com/google/fonts/tree/main/ofl/mynerve | Main picker, default for new documents. Real alphabet alternate outlines used by the vector renderer when variation is enabled. |
| Gloria Hallelujah | https://github.com/google/fonts/tree/main/ofl/gloriahallelujah | Main picker. Based on a high-school student's handwriting. |
| Handlee | https://github.com/google/fonts/tree/main/ofl/handlee | Main picker. Based on Joe Prince's handwriting. |
| Reenie Beanie | https://github.com/google/fonts/tree/main/ofl/reeniebeanie | Main picker. Loose ballpoint writing; test small symbols before printing. |
| Edu NSW ACT Foundation | https://github.com/google/fonts/tree/main/ofl/edunswactfoundation | Main picker. Neat sloped school print; default regular weight of the variable TTF. |
| Playpen Sans | https://github.com/google/fonts/tree/main/ofl/playpensans | Comparison page only. Its shuffler requires OpenType contextual shaping, which the current fixed-cell renderer does not implement. |

Compare browser specimens and download TTF files at `/font-comparison.html`. The specimen uses browser shaping and natural advance widths; the main app uses fixed-width code cells and custom deterministic variation for Mynerve. They are intentionally not identical layouts.

Sources/descriptions:
- https://fonts.google.com/specimen/Mynerve
- https://fonts.google.com/specimen/Gloria+Hallelujah
- https://fonts.google.com/specimen/Handlee
- https://fonts.google.com/specimen/Reenie+Beanie
- https://fonts.google.com/specimen/Edu+NSW+ACT+Foundation
- https://github.com/TypeTogether/Playpen-Sans
