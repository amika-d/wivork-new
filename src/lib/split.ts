/** Walk text nodes only, so links, <em> and <br> survive. Returns the new word spans. */
export function wrapWords(el: HTMLElement, cls = "rw"): HTMLElement[] {
  const words: HTMLElement[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  el.setAttribute("aria-label", el.textContent?.replace(/\s+/g, " ").trim() ?? "");
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    (node.textContent ?? "").split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (!part.trim()) return frag.appendChild(document.createTextNode(part));
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = part;
      s.setAttribute("aria-hidden", "true");
      words.push(s);
      frag.appendChild(s);
    });
    node.replaceWith(frag);
  });
  return words;
}

/** Masked word split for headline slide-ups. */
export function maskWords(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  wrapWords(el, "sw-mask").forEach((mask) => {
    const inner = document.createElement("span");
    inner.className = "sw";
    inner.textContent = mask.textContent;
    mask.textContent = "";
    mask.appendChild(inner);
    out.push(inner);
  });
  return out;
}
