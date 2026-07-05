/**
 * Filtrage des réalisations par catégorie (page /realisations).
 * JS léger, sans rechargement de page.
 */
function initFilters(): void {
  const filterBar = document.querySelector<HTMLElement>('[data-filters]');
  const grid = document.querySelector<HTMLElement>('[data-grid]');
  if (!filterBar || !grid) return;

  const buttons = filterBar.querySelectorAll<HTMLButtonElement>('[data-filter]');
  const cards = grid.querySelectorAll<HTMLElement>('[data-category]');

  filterBar.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]');
    if (!button) return;

    const filter = button.dataset.filter;
    buttons.forEach((b) => b.setAttribute('aria-selected', String(b === button)));
    cards.forEach((card) => {
      const visible = filter === 'Toutes' || card.dataset.category === filter;
      card.style.display = visible ? '' : 'none';
    });
  });
}

initFilters();
