export function printHTML(html: string, title = "Receipt") {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: #000; margin: 0; padding: 8px; }
    h1 { font-size: 14px; text-align: center; margin: 4px 0; }
    .center { text-align: center; }
    .muted { color: #555; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
  </style></head><body>${html}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300);};</script></body></html>`);
  w.document.close();
}