// The three transformation clips, extracted to public/sequence/f_0000..f_0357.webp.
// Seq 0-119: photo -> 3D model. 120-238: model -> turntable. 239-357: hand painting.

export const SEQ = {
  count: 358,
  path: (i: number) => `/sequence/f_${String(i).padStart(4, "0")}.webp`,
};

const frames: (HTMLImageElement | null)[] = Array(SEQ.count).fill(null);

/** Scroll progress through the world (0..1) -> frame number. Edit these to retime the story. */
const KEYS: [number, number][] = [
  [0, 0],
  [0.12, 0], // hold on the photo while the hero reads
  [0.21, 20], // chapter 01
  [0.46, 119], // chapter 02: model complete
  [0.71, 238], // chapter 03: on the turntable
  [0.96, 357], // chapter 04: painted
  [1, 357],
];

export function frameAt(p: number) {
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i][0]) {
      const [p0, f0] = KEYS[i - 1];
      const [p1, f1] = KEYS[i];
      return f0 + ((p - p0) / (p1 - p0)) * (f1 - f0);
    }
  }
  return SEQ.count - 1;
}

function load(i: number) {
  return new Promise<void>((resolve) => {
    if (frames[i]) return resolve();
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      frames[i] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = SEQ.path(i);
  });
}

const coarse = Array.from({ length: SEQ.count }, (_, i) => i).filter(
  (i) => i % 8 === 0 || i === SEQ.count - 1
);
const rest = Array.from({ length: SEQ.count }, (_, i) => i).filter((i) => !coarse.includes(i));

async function lanes(list: number[], onEach?: () => void, n = 4) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (cursor < list.length) {
        await load(list[cursor++]);
        onEach?.();
      }
    })
  );
}

/** Coarse pass: enough to scrub the whole story at low fidelity. */
export function loadCoarse(onProgress: (p: number) => void) {
  let done = 0;
  return lanes(coarse, () => onProgress(++done / coarse.length));
}

/** Fill in the gaps in the background. */
export function loadRest(onEach?: () => void) {
  return lanes(rest, onEach, 3);
}

export function createStage(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  let pos = 0;

  const nearest = (i: number) => {
    for (let k = i; k >= 0; k--) if (frames[k]) return frames[k];
    for (let k = i; k < SEQ.count; k++) if (frames[k]) return frames[k];
    return null;
  };

  const cover = (img: HTMLImageElement) => {
    const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    return [(canvas.width - w) / 2, (canvas.height - h) / 2, w, h] as const;
  };

  function render(p = pos) {
    pos = Math.min(SEQ.count - 1, Math.max(0, p));
    const lo = Math.floor(pos);
    const a = nearest(lo);
    if (!a) return;
    ctx.globalAlpha = 1;
    ctx.drawImage(a, ...cover(a));
    const t = pos - lo;
    const b = nearest(Math.min(SEQ.count - 1, lo + 1));
    if (b && b !== a && t > 0.02) {
      ctx.globalAlpha = t;
      ctx.drawImage(b, ...cover(b));
      ctx.globalAlpha = 1;
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    render();
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  return { render, resize };
}
