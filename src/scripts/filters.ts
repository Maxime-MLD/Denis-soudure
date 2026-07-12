/**
 * Filtrage des réalisations par catégorie (page /realisations).
 * JS léger, sans rechargement de page.
 */
function initFilters(): void {
  const filterBar = document.querySelector<HTMLElement>('[data-filters]');
  const grid = document.querySelector<HTMLElement>('[data-grid]');
  if (!filterBar || !grid) return;

  const buttons = filterBar.querySelectorAll<HTMLButtonElement>('[data-filter]');
  // Uniquement les cartes (enfants directs), pas les boutons imbriqués qui portent
  // aussi data-category.
  const cards = Array.from(grid.querySelectorAll<HTMLElement>(':scope > [data-category]'));

  // Le lazy-load natif ne se déclenche pas toujours quand on révèle une carte via
  // le filtre (image jamais entrée dans le viewport). On force alors son chargement.
  const loadVisibleImages = (): void => {
    for (const card of cards) {
      if (card.style.display === 'none') continue;
      const img = card.querySelector<HTMLImageElement>('img');
      if (img && img.loading === 'lazy' && !img.complete) img.loading = 'eager';
    }
  };

  filterBar.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]');
    if (!button) return;

    const filter = button.dataset.filter;
    buttons.forEach((b) => b.setAttribute('aria-selected', String(b === button)));
    for (const card of cards) {
      const visible = filter === 'Toutes' || card.dataset.category === filter;
      card.style.display = visible ? '' : 'none';
    }
    // Après le reflow (layout appliqué) pour que `sizes` se calcule sur la vraie largeur.
    requestAnimationFrame(loadVisibleImages);
  });
}

initFilters();
