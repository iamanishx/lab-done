import type { Settings } from "./types";
import type { RenderedPage } from "./renderer";

export function downloadText(text: string, name: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export async function downloadPdf(pages: RenderedPage[], settings: Settings, name: string, progress: (value: string) => void) {
  const [{ jsPDF }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
  const orientation = settings.width > settings.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: [settings.width, settings.height], compress: true });
  pdf.setProperties({ title: name, creator: "Lab done" });
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden";
  document.body.appendChild(host);
  try {
    for (let i = 0; i < pages.length; i++) {
      progress(`Exporting page ${i + 1} / ${pages.length}`);
      if (i) pdf.addPage([settings.width, settings.height], orientation);
      host.innerHTML = pages[i].svg;
      await pdf.svg(host.querySelector("svg")!, { x: 0, y: 0, width: settings.width, height: settings.height });
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }
    pdf.save(`${name}.pdf`);
  } finally { host.remove(); }
}
