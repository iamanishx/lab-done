import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, Code2, FileText, PenLine, Printer, RotateCcw, Terminal, X } from "lucide-react";
import { DEFAULT_SETTINGS, FONT_FAMILIES, FONT_OPTIONS, MAX_SOURCE_LENGTH } from "./types";
import type { Settings, InputMode } from "./types";
import { MARKDOWN_SAMPLE, OUTPUT_SAMPLE, PYTHON_SAMPLE } from "./sample";
import { renderPages, setCustomFont } from "./renderer";
import type { RenderResult } from "./renderer";
import { downloadPdf, downloadText } from "./export";

const STORAGE_KEY = "lab-done-v1";
function loadDraft(): { source: string; output: string; mode: InputMode; settings: Settings } {
  const defaults = { source: PYTHON_SAMPLE, output: OUTPUT_SAMPLE, mode: "python" as InputMode, settings: DEFAULT_SETTINGS };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved.source !== "string" || typeof saved.output !== "string") return defaults;
    const s = { ...DEFAULT_SETTINGS, ...saved.settings };
    for (const [key, min, max] of [["width", 100, 420], ["height", 100, 594], ["margin", 5, 40], ["fontSize", 12, 30], ["lineHeight", 1.2, 2.2]] as const) {
      if (!Number.isFinite(s[key])) s[key] = DEFAULT_SETTINGS[key];
      s[key] = Math.min(max, Math.max(min, s[key]));
    }
    if (!/^#[0-9a-f]{6}$/i.test(s.ink)) s.ink = DEFAULT_SETTINGS.ink;
    if (!FONT_OPTIONS.some(([font]) => font === s.font)) s.font = DEFAULT_SETTINGS.font;
    return { source: saved.source.slice(0, MAX_SOURCE_LENGTH), output: saved.output.slice(0, MAX_SOURCE_LENGTH), mode: ["python", "markdown", "latex"].includes(saved.mode) ? saved.mode : "python", settings: s };
  } catch { return defaults; }
}

export default function App() {
  const [draft] = useState(loadDraft);
  const [source, setSource] = useState(draft.source);
  const [output, setOutput] = useState(draft.output);
  const [mode, setMode] = useState<InputMode>(draft.mode);
  const [settings, setSettings] = useState<Settings>(draft.settings);
  const [tab, setTab] = useState<"record" | "output">("record");
  const [rendered, setRendered] = useState<RenderResult>({ pages: [], warnings: [] });
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(70);
  const [rendering, setRendering] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [help, setHelp] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const content = tab === "record" ? source : output;
  const isOutput = tab === "output";
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(current => ({ ...current, [key]: value }));

  useEffect(() => {
    let cancelled = false;
    setRendering(true); setError("");
    const timer = setTimeout(() => {
      renderPages(content, mode, settings, isOutput).then(result => {
        if (cancelled) return;
        setRendered(result); setPage(current => Math.min(current, result.pages.length - 1));
      }).catch(err => {
        if (!cancelled) { setError(err instanceof Error ? err.message : "Rendering failed."); setRendered({ pages: [], warnings: [] }); }
      }).finally(() => { if (!cancelled) setRendering(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [content, mode, settings, isOutput]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ source, output, mode, settings })); }
      catch { setNotice("Browser storage is unavailable. Download your source to keep a copy."); }
    }, 500);
    return () => clearTimeout(timer);
  }, [source, output, mode, settings]);
  useEffect(() => { setPage(0); }, [tab]);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 500_000) throw new Error("Please import a text file smaller than 500 KB.");
      const text = await file.text();
      if (text.length > MAX_SOURCE_LENGTH) throw new Error("This file exceeds the 150,000-character document limit.");
      if (isOutput) setOutput(text);
      else {
        setSource(text);
        setMode(file.name.endsWith(".py") ? "python" : file.name.endsWith(".tex") ? "latex" : "markdown");
      }
      setNotice(`Imported ${file.name}.`);
    } catch (err) { setNotice(err instanceof Error ? err.message : "File import failed."); }
    event.target.value = "";
  }
  async function importFont(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Choose a font smaller than 5 MB.");
      const buffer = await file.arrayBuffer();
      setCustomFont(buffer);
      const face = new FontFace("My Handwriting", buffer);
      await face.load(); document.fonts.add(face);
      update("font", "custom"); setNotice("Custom font loaded locally. Re-upload it after refreshing.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Font import failed."); }
    event.target.value = "";
  }
  async function exportPdf() {
    if (rendering || busy || !rendered.pages.length) return;
    setBusy("Preparing vector PDF");
    try { await downloadPdf(rendered.pages, settings, isOutput ? "lab-output" : "lab-record", setBusy); }
    catch (err) { setNotice(err instanceof Error ? err.message : "Export failed. Try browser printing instead."); }
    finally { setBusy(""); }
  }
  function loadExample() {
    if (isOutput) {
      if (output !== OUTPUT_SAMPLE && !window.confirm("Replace the current output with the actual example run?")) return;
      setOutput(OUTPUT_SAMPLE);
    } else {
      const example = mode === "python" ? PYTHON_SAMPLE : MARKDOWN_SAMPLE;
      if (source !== example && !window.confirm("Replace the current document with the distance-measures example?")) return;
      setSource(example); if (mode === "latex") setMode("markdown");
    }
  }
  function sourceDownload() {
    if (isOutput) downloadText(output, "lab-output.txt");
    else downloadText(source, mode === "python" ? "lab-program.py" : mode === "latex" ? "lab-body.tex" : "lab-record.md");
  }

  return <>
    <style>{`@media print { @page { size: ${settings.width}mm ${settings.height}mm; margin: 0; } }`}</style>
    <input hidden type="file" accept=".py,.md,.markdown,.tex,.txt,.log" ref={fileInput} onChange={importFile}/>
    <input hidden type="file" accept=".ttf,.otf,.woff" ref={fontInput} onChange={importFont}/>
    <div className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="#" aria-label="Lab done home"><PenLine size={21} strokeWidth={1.5}/><span>lab done<span className="brand-period">.</span></span></a>
        <div className="header-note">YOUR NOTES, A LITTLE MORE HUMAN.</div>
        <button className="text-button" onClick={() => setHelp(true)}>How it works <ChevronRight size={14}/></button>
      </header>
      <section className="intro">
        <div><p className="kicker">A SMALL TOOL FOR LONG LAB RECORDS</p><h1>A little less writing.<br/><em>A little more weekend.</em></h1></div>
        <p className="lede">Your code and notes, in blue ink.<br/>Paste, set your paper, and print.<br/><span>Nothing leaves your browser. No AI model.</span></p>
      </section>
      <div className="document-bar">
        <div className="document-tabs" role="tablist" aria-label="Document type">
          <button role="tab" aria-selected={!isOutput} className={!isOutput ? "selected" : ""} onClick={() => setTab("record")}><PenLine size={16}/>Lab record</button>
          <button role="tab" aria-selected={isOutput} className={isOutput ? "selected" : ""} onClick={() => setTab("output")}><Terminal size={16}/>Output printout</button>
        </div>
        <div className="export-actions"><button className="button secondary" disabled={rendering || !rendered.pages.length || !!busy} onClick={() => window.print()}><Printer size={15}/>Print</button><button className="button primary" disabled={rendering || !rendered.pages.length || !!busy} onClick={exportPdf}><ArrowDownToLine size={15}/>{busy || "Download PDF"}</button></div>
      </div>
      <main className="workspace">
        <section className="editor-panel" aria-label="Source editor">
          <div className="panel-heading"><h2><span className="section-number">01</span>{isOutput ? "Your output" : "Your source"}</h2><button className="icon-button" title="Import a text file" aria-label="Import a text file" onClick={() => fileInput.current?.click()}><ArrowUpFromLine size={17}/></button></div>
          {!isOutput && <div className="format-tabs" role="group" aria-label="Source format">{([['python', 'Python'], ['markdown', 'Markdown'], ['latex', 'LaTeX body']] as const).map(([value, label]) => <button key={value} className={mode === value ? "active" : ""} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div>}
          {isOutput && <p className="output-editor-note">Paste real terminal output here. It prints in black monospace, separately from your handwritten record.</p>}
          <textarea aria-label={isOutput ? "Terminal output" : "Document source"} spellCheck={false} value={content} maxLength={MAX_SOURCE_LENGTH} placeholder={isOutput ? "Paste your program's output here…" : "Paste your Python program or notes here…"} onChange={event => isOutput ? setOutput(event.target.value) : setSource(event.target.value)} onKeyDown={event => {
            if (event.key === "Tab") {
              event.preventDefault();
              const el = event.currentTarget, start = el.selectionStart, end = el.selectionEnd;
              if (content.length - (end - start) + 4 > MAX_SOURCE_LENGTH) return;
              const next = content.slice(0, start) + "    " + content.slice(end);
              if (isOutput) setOutput(next); else setSource(next);
              requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4; });
            }
          }}/>
          <div className="editor-status"><span>{content.split("\n").length} lines · {content.length.toLocaleString()} characters</span><span>LOCAL DRAFT</span></div>
          <div className="editor-actions"><button className="text-button" onClick={loadExample}><RotateCcw size={13}/>Load example</button><button className="text-button" onClick={sourceDownload}><ArrowDownToLine size={13}/>{isOutput ? "Save .txt" : "Save source"}</button></div>
          <div className="editor-footnote"><Code2 size={17}/><p>{isOutput ? "Example output was actually run with inputs 0, 1, 7, 8. Replace it with your own run." : "Symbols stay intact. Indentation stays aligned. Long code lines fit without being rewritten."}</p></div>
        </section>
        <section className="preview-panel" aria-label="Page preview">
          <div className="panel-heading"><h2><span className="section-number">02</span>{isOutput ? "Output on paper" : "Ink on paper"}</h2><span className="live-status" role="status">{rendering ? "SETTING THE PAGE…" : error ? "CHECK SOURCE" : `${rendered.pages.length} ${rendered.pages.length === 1 ? "PAGE" : "PAGES"}`}</span></div>
          <div className="preview-toolbar"><span>{settings.paper === "custom" ? "CUSTOM" : settings.paper.toUpperCase()} · {settings.width} × {settings.height} mm</span><label>Zoom <select aria-label="Preview zoom" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value={45}>45%</option><option value={55}>55%</option><option value={70}>70%</option><option value={85}>85%</option><option value={100}>100%</option></select></label></div>
          <div className="paper-stage" aria-busy={rendering}>
            {error ? <div className="render-error"><FileText size={25}/><h3>A small thing to fix.</h3><p>{error}</p></div> : rendered.pages[page] ? <div className="paper-preview" style={{ width: `${settings.width * 96 / 25.4 * zoom / 100}px` }} dangerouslySetInnerHTML={{ __html: rendered.pages[page].svg }}/> : <p className="empty-preview">{rendering ? "Loading your handwriting…" : "Your page starts here."}</p>}
          </div>
          <div className="pagination"><button className="icon-button" aria-label="Previous page" disabled={page <= 0} onClick={() => setPage(current => current - 1)}><ChevronLeft size={17}/></button><span>Page {rendered.pages.length ? page + 1 : 0} / {rendered.pages.length}</span><button className="icon-button" aria-label="Next page" disabled={page >= rendered.pages.length - 1} onClick={() => setPage(current => current + 1)}><ChevronRight size={17}/></button></div>
          {rendered.warnings.length > 0 && <div className="layout-warnings" role="status">{rendered.warnings.map(warning => <p key={warning}>{warning}</p>)}</div>}
        </section>
        <aside className="settings-panel" aria-label="Page settings">
          <div className="panel-heading"><h2><span className="section-number">03</span>The details</h2></div>
          <fieldset><legend>THE PAPER</legend><label className="field-label" htmlFor="paper-size">Paper size</label><select id="paper-size" value={settings.paper} onChange={event => {
            const paper = event.target.value as Settings['paper'];
            setSettings(current => ({ ...current, paper, ...(paper === "a4" ? { width: 210, height: 297 } : paper === "letter" ? { width: 215.9, height: 279.4 } : {}) }));
          }}><option value="a4">A4 · 210 × 297 mm</option><option value="letter">US Letter</option><option value="custom">Custom lab paper</option></select>
          {settings.paper === "custom" && <div className="dimension-fields">{([['width', 'Width', 100, 420], ['height', 'Height', 100, 594]] as const).map(([key, label, min, max]) => <label key={key}>{label} (mm)<input type="number" min={min} max={max} value={settings[key]} onChange={event => update(key, Math.min(max, Math.max(min, Number(event.target.value) || min)))}/></label>)}</div>}
          <Range label="Margins" value={settings.margin} min={5} max={40} unit=" mm" onChange={value => update("margin", value)}/>
          <Toggle label="Print ruled lines" checked={settings.ruled} onChange={value => update("ruled", value)}/><Toggle label="Print margin guide" checked={settings.guideMargin} onChange={value => update("guideMargin", value)}/><Toggle label="Page numbers" checked={settings.pageNumbers} onChange={value => update("pageNumbers", value)}/>
          <p className="small-note">Already ruled paper? Leave lines off.</p></fieldset>
          {!isOutput && <><fieldset><legend>THE HANDWRITING</legend><div className="font-options">{FONT_OPTIONS.map(([value, label, family]) => <button className={settings.font === value ? "active" : ""} key={value} aria-pressed={settings.font === value} onClick={() => update("font", value)}><span style={{ fontFamily: family }}>The quick brown fox</span><small>{label}</small></button>)}</div>
          <p className="small-note"><a href="/font-comparison.html" target="_blank" rel="noreferrer">Compare fonts with code →</a></p>
          <button className="text-button custom-font-button" onClick={() => fontInput.current?.click()}><ArrowUpFromLine size={13}/>Upload handwriting font</button><p className="small-note">Make a .ttf from your writing with <a href="https://www.calligraphr.com/" target="_blank" rel="noreferrer">Calligraphr</a>. Include numbers and code punctuation, especially _ = + * / [ ] {'{ }'}.</p>{settings.font === "custom" && <p className="small-note" style={{ fontFamily: FONT_FAMILIES.custom }}>Your handwriting font is active.</p>}
          <Range label="Letter size" value={settings.fontSize} min={12} max={30} unit=" px" onChange={value => update("fontSize", value)}/><Range label="Line spacing" value={settings.lineHeight} min={1.2} max={2.2} step={0.1} unit="×" onChange={value => update("lineHeight", value)}/><Toggle label="Subtle letter variation" checked={settings.variation} onChange={value => update("variation", value)}/></fieldset>
          <fieldset><legend>THE INK</legend><div className="ink-row"><span className="blue-sample" style={{ background: settings.ink }}/><span>Blue ballpoint</span><input type="color" aria-label="Ink color" value={settings.ink} onChange={event => update("ink", event.target.value)}/></div><p className="small-note">All code and notes use the same ink.</p></fieldset></>}
          {isOutput && <div className="output-settings-note"><Terminal size={22}/><h3>Run it. Keep the proof.</h3><p>Download the .py source from the Lab record tab, run it locally, then paste your terminal output here.</p><code>python3 lab-program.py</code><p>The app formats output. It does not execute uploaded code.</p></div>}
          <p className="settings-footer">Handwriting-style glyphs, not a neural handwriting generator. Math uses MathJax + Euler. Preview and PDF use the same vector shapes.</p>
        </aside>
      </main>
      <footer className="site-footer"><span>LAB DONE · MADE FOR THE PAPER PART</span><span>Print at 100% scale. Turn browser headers and footers off.</span></footer>
    </div>
    <div className="print-document" aria-hidden="true">{rendered.pages.map((item, index) => <div className="print-page" key={index} dangerouslySetInnerHTML={{ __html: item.svg }}/>)}</div>
    {notice && <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice("")}><X size={15}/></button></div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={event => event.stopPropagation()}><button autoFocus className="icon-button close-dialog" aria-label="Close help" onClick={() => setHelp(false)}><X size={20}/></button><p className="kicker">FROM SOURCE TO SHEET</p><h2 id="help-title">The paper part, sorted.</h2><ol><li><strong>Paste your record.</strong> Choose Python for raw code, or Markdown for headings, notes, tables, and fenced code blocks.</li><li><strong>Add equations.</strong> Use <code>$…$</code> inline and <code>$$</code> on separate lines for display maths. LaTeX body mode supports basic section, text, equation, and verbatim commands, not full .tex documents.</li><li><strong>Set your paper.</strong> Select its actual dimensions. Turn ruled lines off when printing on pre-ruled paper. Add <code>&lt;!-- pagebreak --&gt;</code> in Markdown for a manual page break.</li><li><strong>Print or download.</strong> PDF contains vector shapes, not screenshots. Print at 100% scale.</li><li><strong>Run the program yourself.</strong> Save your .py source, run locally, and paste the real terminal output into Output printout. Download or print that separately to stick into your record.</li></ol><p className="small-note">Fonts and rendering are local. Custom fonts stay in memory until refresh. Use printed handwriting-style records only where your lab permits them.</p></section></div>}
  </>;
}

function Range({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (value: number) => void }) {
  return <label className="range-field"><span>{label}<output>{Number(value.toFixed(1))}{unit}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/></label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-field"><span>{label}</span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}/></label>;
}
