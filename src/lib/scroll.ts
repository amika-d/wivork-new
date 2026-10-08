import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createStage, frameAt, loadCoarse, loadRest } from "./sequence";
import { maskWords, wrapWords } from "./split";

gsap.registerPlugin(ScrollTrigger);

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
const $$ = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export async function init() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) document.documentElement.classList.add("reduced");

  const canvas = $<HTMLCanvasElement>("[data-stage]")!;
  const stage = createStage(canvas);

  // ---- Preloader: coarse frames first, then the page opens ----
  const bar = $("[data-preloader-bar]")!;
  await Promise.race([
    loadCoarse((p) => (bar.style.transform = `scaleX(${p})`)),
    new Promise((r) => setTimeout(r, 7000)),
  ]);
  stage.render(0);
  loadRest(); // the rest streams in while the visitor reads the hero

  const lenis = reduced ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const loader = $("[data-preloader]")!;
  const letters = $$("[data-hero-letter]");
  gsap.set(letters, { yPercent: 110, autoAlpha: 0 });
  gsap
    .timeline({ defaults: { ease: "power4.inOut" } })
    .to(bar, { opacity: 0, duration: 0.3 })
    .to(loader, { yPercent: -100, duration: 0.9 })
    .add(() => {
      document.body.classList.remove("is-loading");
      loader.remove();
    }, "<0.6")
    .to(letters, { yPercent: 0, autoAlpha: 1, duration: 1.1, stagger: 0.07, ease: "power4.out" }, "-=0.4");

  // ---- Header: progress bar, glass on scroll, smooth anchor jumps ----
  const header = $("[data-header]")!;
  const progress = $("[data-progress]")!;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      progress.style.transform = `scaleX(${self.progress})`;
      const solid = self.scroll() > 60;
      header.classList.toggle("bg-ink-800/80", solid);
      header.classList.toggle("backdrop-blur-md", solid);
      header.classList.toggle("border-ink-600/60", solid);
    },
  });
  $$("[data-scroll-to]").forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? 0 : $(id!);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target as number | HTMLElement, { duration: 1.6 });
      else (target instanceof HTMLElement ? target : document.body).scrollIntoView({ behavior: "smooth" });
    })
  );

  if (reduced) {
    stage.render(357);
    $$(".rw").forEach((w) => (w.style.opacity = "1"));
    window.addEventListener("fontschange", () => stage.resize());
    return;
  }

  // ---- 1 · World: one scroll position drives the figure, hero and chapters ----
  const world = $("[data-world]")!;
  const hero = $("[data-hero]")!;
  const scrims = { left: $("[data-scrim=left]")!, right: $("[data-scrim=right]")! };
  const ticks = $$("[data-tick]");
  const sides = $$("[data-chapter]").map((c) => c.dataset.side as "left" | "right");
  let activeChapter = -1;

  ScrollTrigger.create({
    trigger: world,
    start: "top top",
    end: "bottom bottom",
    onUpdate: ({ progress: p }) => {
      stage.render(frameAt(p));
      const h = clamp(p / 0.1);
      hero.style.opacity = String(1 - h);
      hero.style.transform = `translateY(${-h * 12}vh) scale(${1 + h * 0.08})`;
      hero.style.pointerEvents = h > 0.9 ? "none" : "auto";

      const idx = p < 0.1 ? -1 : p < 0.33 ? 0 : p < 0.58 ? 1 : p < 0.83 ? 2 : 3;
      if (idx === activeChapter) return;
      activeChapter = idx;
      scrims.left.style.opacity = idx >= 0 && sides[idx] === "left" ? "1" : "0";
      scrims.right.style.opacity = idx >= 0 && sides[idx] === "right" ? "1" : "0";
      ticks.forEach((t, i) => {
        t.classList.toggle("text-gold", i === idx);
        t.classList.toggle("text-paper/30", i !== idx);
        $("[data-tick-label]", t)!.style.opacity = i === idx ? "1" : "0";
      });
    },
  });

  $$("[data-chapter]").forEach((ch) => {
    const inner = $("[data-chapter-inner]", ch)!;
    const dir = ch.dataset.side === "left" ? -1 : 1;
    // Each chapter slides in from its own side, then leaves the same way
    gsap.fromTo(
      inner,
      { x: dir * 120, autoAlpha: 0 },
      {
        x: 0,
        autoAlpha: 1,
        ease: "none",
        scrollTrigger: { trigger: inner, start: "top 88%", end: "top 55%", scrub: true },
      }
    );
    gsap.to(inner, {
      x: dir * -60,
      autoAlpha: 0,
      ease: "none",
      scrollTrigger: { trigger: inner, start: "bottom 48%", end: "bottom 18%", scrub: true },
    });
  });

  // ---- 2 · Manifesto: words arrive as you read ----
  const words = wrapWords($("[data-reveal-words]")!);
  words.forEach((w) => gsap.set(w, { opacity: 0.14, filter: "blur(8px)", y: "0.18em" }));
  ScrollTrigger.create({
    trigger: $("[data-manifesto]")!,
    start: "top top",
    end: "bottom bottom",
    onUpdate: ({ progress: p }) => {
      const span = clamp((p - 0.05) / 0.8);
      words.forEach((w, i) => {
        const local = clamp(span * words.length * 1.2 - i);
        w.style.opacity = String(0.14 + local * 0.86);
        w.style.filter = `blur(${(1 - local) * 8}px)`;
        w.style.transform = `translateY(${(1 - local) * 0.18}em)`;
      });
    },
  });

  // ---- 3 · Services: pinned, scrolls sideways; images drift inside their cards ----
  const hs = $("[data-hscroll]")!;
  const track = $("[data-hscroll-track]")!;
  const hbar = $("[data-hscroll-bar]")!;
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const slide = gsap.to(track, {
    x: () => -dist(),
    ease: "none",
    scrollTrigger: {
      trigger: hs,
      start: "top top",
      end: () => `+=${dist()}`,
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => (hbar.style.transform = `scaleX(${self.progress})`),
    },
  });
  $$("[data-hcard]").forEach((card) => {
    gsap.fromTo(
      $("[data-hcard-img]", card)!,
      { xPercent: -6 },
      {
        xPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: card,
          containerAnimation: slide,
          start: "left right",
          end: "right left",
          scrub: true,
        },
      }
    );
  });

  // ---- 4 · Studio: marquees pull in opposite directions ----
  $$("[data-marquee]").forEach((row) => {
    const dir = Number(row.dataset.marquee);
    gsap.fromTo(
      row,
      { x: dir < 0 ? 0 : 0 },
      {
        x: () => dir * row.scrollWidth * 0.22,
        ease: "none",
        scrollTrigger: { trigger: $("[data-marquees]")!, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });
  $$("[data-mask]").forEach((el) => {
    gsap.fromTo(
      maskWords(el),
      { yPercent: 115 },
      {
        yPercent: 0,
        duration: 1,
        ease: "power4.out",
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      }
    );
  });
  gsap.from($$("[data-feature]"), {
    y: 40,
    autoAlpha: 0,
    duration: 0.9,
    ease: "power3.out",
    stagger: 0.1,
    scrollTrigger: { trigger: $("[data-feature]")!, start: "top 88%", once: true },
  });

  // ---- 5 · CTA + footer ----
  gsap.fromTo(
    $("[data-parallax]")!,
    { yPercent: -8 },
    {
      yPercent: 8,
      ease: "none",
      scrollTrigger: { trigger: $("[data-cta]")!, start: "top bottom", end: "bottom top", scrub: true },
    }
  );
  gsap.fromTo(
    $("[data-footer-mark]")!,
    { yPercent: 35, autoAlpha: 0.2 },
    {
      yPercent: 0,
      autoAlpha: 1,
      ease: "none",
      scrollTrigger: { trigger: $("[data-footer-mark]")!, start: "top bottom", end: "bottom bottom", scrub: true },
    }
  );

  // Fonts and images change geometry; remeasure
  const refresh = () => {
    stage.resize();
    ScrollTrigger.refresh();
  };
  window.addEventListener("load", refresh);
  window.addEventListener("fontschange", refresh);
  document.fonts?.ready.then(refresh);
}
