/**
 * Toutes les animations du site : Lenis (smooth scroll à inertie),
 * GSAP + ScrollTrigger (animations directionnelles au scroll),
 * menu mobile (burger).
 * Importé une seule fois dans Layout.astro.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Ferme le menu mobile s'il est ouvert (assigné par initMobileMenu). */
let closeMenu: (() => void) | null = null;

/* ------------------------------------------------------------------
   Lenis — inertie prononcée (effet Bugatti.com) : le scroll continue
   légèrement après le relâchement de la molette, pas d'arrêt net.
------------------------------------------------------------------- */
function initLenis(): Lenis {
  const lenis = new Lenis({
    duration: 1.4,
    lerp: 0.075,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.5,
  });

  // Synchronisation Lenis <-> ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // La lightbox (script séparé) demande l'arrêt/reprise du scroll via événements
  window.addEventListener('lightbox:open', () => lenis.stop());
  window.addEventListener('lightbox:close', () => lenis.start());

  // Ancres internes : scroll fluide via Lenis (ferme le menu mobile au passage)
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/#"], a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.hash;
      if (!hash) return;
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;
      e.preventDefault();
      closeMenu?.();
      lenis.scrollTo(target, { offset: -80 });
    });
  });

  return lenis;
}

/* ------------------------------------------------------------------
   Navbar — descend au chargement + fond sombre au scroll
------------------------------------------------------------------- */
function initNavbar(): void {
  const navbar = document.querySelector<HTMLElement>('[data-navbar]');
  if (!navbar) return;

  if (!prefersReducedMotion) {
    gsap.from(navbar, {
      y: -100,
      duration: 1,
      ease: 'power3.out',
      // un transform résiduel ferait du header le containing block du menu mobile fixed
      onComplete: () => gsap.set(navbar, { clearProps: 'transform' }),
    });
  }

  ScrollTrigger.create({
    start: 80,
    onEnter: () => navbar.classList.add('is-scrolled'),
    onLeaveBack: () => navbar.classList.remove('is-scrolled'),
  });
}

/* ------------------------------------------------------------------
   Menu mobile — burger + panneau plein écran (sous lg).
   Doit fonctionner même en prefers-reduced-motion (sans animation).
------------------------------------------------------------------- */
function initMobileMenu(lenis: Lenis | null): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-mobile-menu]');
  if (!toggle || !menu) return;

  const links = menu.querySelectorAll<HTMLElement>('[data-menu-link]');
  let open = false;

  const tl = gsap
    .timeline({ paused: true })
    .to(menu, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
    .fromTo(
      links,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out' },
      0.15,
    );

  const setOpen = (value: boolean): void => {
    if (value === open) return;
    open = value;
    toggle.setAttribute('aria-expanded', String(value));
    toggle.setAttribute('aria-label', value ? 'Fermer le menu' : 'Ouvrir le menu');
    document.documentElement.classList.toggle('menu-open', value);

    if (prefersReducedMotion) {
      menu.style.visibility = value ? 'visible' : 'hidden';
      menu.style.opacity = value ? '1' : '0';
    } else if (value) {
      tl.timeScale(1).play();
    } else {
      tl.timeScale(1.6).reverse();
    }

    if (lenis) {
      if (value) lenis.stop();
      else lenis.start();
    }
  };

  closeMenu = () => setOpen(false);

  toggle.addEventListener('click', () => setOpen(!open));
  links.forEach((link) => link.addEventListener('click', () => setOpen(false)));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

/* ------------------------------------------------------------------
   Hero — watermark "DeniSoudure" : les deux moitiés du mot arrivent
   de la gauche et de la droite et s'assemblent au chargement.
------------------------------------------------------------------- */
function initHeroWatermark(): void {
  const left = document.querySelector('[data-anim="watermark-left"]');
  const right = document.querySelector('[data-anim="watermark-right"]');
  if (!left || !right) return;

  const tl = gsap.timeline({ defaults: { duration: 1.2, ease: 'power3.out' } });
  tl.fromTo(left, { xPercent: -35, opacity: 0 }, { xPercent: 0, opacity: 1 }, 0.15).fromTo(
    right,
    { xPercent: 35, opacity: 0 },
    { xPercent: 0, opacity: 1 },
    0.15,
  );
}

/* ------------------------------------------------------------------
   Hero — H1, sous-titre et CTA apparaissent ensemble AU CHARGEMENT
   (et non au scroll : le CTA en bas du hero n'atteignait pas le seuil
   du ScrollTrigger et ne se déclenchait qu'au premier scroll).
------------------------------------------------------------------- */
function initHeroContent(): void {
  const items = document.querySelectorAll<HTMLElement>('#accueil [data-anim="up"]');
  if (!items.length) return;
  gsap.fromTo(
    items,
    { y: 40, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.2 },
  );
}

/* ------------------------------------------------------------------
   Animations directionnelles au scroll :
   - data-anim="left"  : arrive de la gauche
   - data-anim="right" : arrive de la droite
   - data-anim="up"    : arrive du bas
   Sous md (768px), left/right deviennent un simple fade-up pour
   éviter les mouvements horizontaux gênants sur petit écran.
------------------------------------------------------------------- */
function initScrollAnimations(): void {
  const reveal = (el: HTMLElement, offset: { x?: number; y?: number }): gsap.core.Tween =>
    gsap.fromTo(
      el,
      { ...offset, opacity: 0 },
      {
        x: 0,
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      },
    );

  document.querySelectorAll<HTMLElement>('[data-anim="up"]').forEach((el) => {
    if (el.closest('#accueil')) return; // le hero est animé au chargement (initHeroContent)
    reveal(el, { y: 40 });
  });

  const directional = document.querySelectorAll<HTMLElement>(
    '[data-anim="left"], [data-anim="right"]',
  );
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    directional.forEach((el) => reveal(el, { x: el.dataset.anim === 'left' ? -50 : 50 }));
  });
  mm.add('(max-width: 767px)', () => {
    directional.forEach((el) => reveal(el, { y: 40 }));
  });
}

/* ------------------------------------------------------------------
   Compteurs (TrustBar) — les chiffres montent de 0 à leur valeur cible
   quand la barre entre dans le viewport (style compteur).
   Le HTML rend déjà la valeur finale (OK sans JS / reduced-motion).
------------------------------------------------------------------- */
function initCounters(): void {
  document.querySelectorAll<HTMLElement>('[data-count-target]').forEach((el) => {
    const target = Number(el.dataset.countTarget);
    if (Number.isNaN(target)) return;

    const proxy = { value: 0 };
    el.textContent = '0';

    gsap.to(proxy, {
      value: target,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        once: true,
      },
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.value));
      },
    });
  });
}

/* ------------------------------------------------------------------
   Init
------------------------------------------------------------------- */
function init(): void {
  gsap.registerPlugin(ScrollTrigger);

  if (prefersReducedMotion) {
    // Pas d'animation : tout est visible, scroll natif ; le menu mobile
    // et l'état "scrolled" de la navbar restent fonctionnels.
    document.documentElement.classList.remove('has-anim');
    initNavbar();
    initMobileMenu(null);
    return;
  }

  const lenis = initLenis();
  initNavbar();
  initMobileMenu(lenis);
  initHeroWatermark();
  initHeroContent();
  initScrollAnimations();
  initCounters();
}

init();
