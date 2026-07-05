/**
 * Visionneuse (lightbox) des réalisations.
 * - Ouvre l'image cliquée en grand
 * - Navigation gauche/droite (flèches boutons + clavier ←/→), en boucle
 * - Fermeture : croix, clic en dehors de l'image (backdrop), touche Échap
 * - La navigation est limitée aux images de la catégorie de l'image cliquée
 * Le contrôle de Lenis (arrêt du scroll) est délégué à animations.ts via événements.
 */
interface Slide {
  full: string;
  alt: string;
  title: string;
}

function initLightbox(): void {
  const overlay = document.querySelector<HTMLElement>('[data-lightbox]');
  if (!overlay) return;

  const imgEl = overlay.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const placeholderEl = overlay.querySelector<HTMLElement>('[data-lightbox-placeholder]');
  const placeholderLabel = overlay.querySelector<HTMLElement>('[data-lightbox-placeholder-label]');
  const captionEl = overlay.querySelector<HTMLElement>('[data-lightbox-caption]');
  const backdrop = overlay.querySelector<HTMLElement>('[data-lightbox-backdrop]');
  const prevBtn = overlay.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
  const nextBtn = overlay.querySelector<HTMLButtonElement>('[data-lightbox-next]');
  const closeBtn = overlay.querySelector<HTMLButtonElement>('[data-lightbox-close]');

  if (
    !imgEl ||
    !placeholderEl ||
    !placeholderLabel ||
    !captionEl ||
    !backdrop ||
    !prevBtn ||
    !nextBtn ||
    !closeBtn
  ) {
    return;
  }

  const triggers = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-lightbox-trigger]'),
  );
  if (triggers.length === 0) return;

  let slides: Slide[] = [];
  let index = 0;
  let lastFocused: HTMLElement | null = null;

  const isOpen = (): boolean => overlay.getAttribute('aria-hidden') === 'false';

  const render = (): void => {
    const slide = slides[index];
    if (!slide) return;

    if (slide.full) {
      imgEl.src = slide.full;
      imgEl.alt = slide.alt;
      imgEl.classList.remove('hidden');
      placeholderEl.classList.add('hidden');
      placeholderEl.classList.remove('flex');
    } else {
      imgEl.classList.add('hidden');
      imgEl.removeAttribute('src');
      placeholderLabel.textContent = `Placeholder — ${slide.title}`;
      placeholderEl.classList.remove('hidden');
      placeholderEl.classList.add('flex');
    }

    captionEl.textContent = slide.title;

    const multiple = slides.length > 1;
    prevBtn.style.display = multiple ? '' : 'none';
    nextBtn.style.display = multiple ? '' : 'none';
  };

  const open = (category: string, startIndex: number): void => {
    slides = triggers
      .filter((t) => t.dataset.category === category)
      .map((t) => ({
        full: t.dataset.full ?? '',
        alt: t.dataset.alt ?? '',
        title: t.dataset.title ?? '',
      }));
    if (slides.length === 0) return;

    index = startIndex;
    render();

    lastFocused = document.activeElement as HTMLElement | null;
    overlay.classList.remove('opacity-0', 'pointer-events-none');
    overlay.classList.add('opacity-100', 'pointer-events-auto');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('lightbox-open');
    window.dispatchEvent(new CustomEvent('lightbox:open'));
    closeBtn.focus();
  };

  const close = (): void => {
    overlay.classList.add('opacity-0', 'pointer-events-none');
    overlay.classList.remove('opacity-100', 'pointer-events-auto');
    overlay.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('lightbox-open');
    window.dispatchEvent(new CustomEvent('lightbox:close'));
    lastFocused?.focus();
  };

  const go = (dir: number): void => {
    if (slides.length < 2) return;
    index = (index + dir + slides.length) % slides.length;
    render();
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const category = trigger.dataset.category ?? '';
      const sameCategory = triggers.filter((t) => t.dataset.category === category);
      open(category, sameCategory.indexOf(trigger));
    });
  });

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  closeBtn.addEventListener('click', close);

  // Clic en dehors de l'image (backdrop ou zone vide de l'overlay) : ferme
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === backdrop) close();
  });

  // Clavier : Échap ferme, flèches naviguent, Tab reste piégé dans la visionneuse
  window.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowLeft') {
      go(-1);
    } else if (e.key === 'ArrowRight') {
      go(1);
    } else if (e.key === 'Tab') {
      const focusable = [closeBtn, prevBtn, nextBtn].filter((b) => b.style.display !== 'none');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

initLightbox();
