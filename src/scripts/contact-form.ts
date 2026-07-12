/**
 * Formulaire de contact (Web3Forms) en AJAX :
 * - pas de page Web3Forms qui s'ouvre
 * - message de succès (orange) sous le bouton
 * - validation par champ : chaque champ fautif tremble (shake) et affiche
 *   sous lui un message précis (champ vide, email sans « @ »…).
 *   Le shake se re-déclenche à chaque nouvelle tentative.
 * - erreur d'envoi (serveur/réseau) : message rouge sous le bouton.
 */
type Field = HTMLInputElement | HTMLTextAreaElement;

function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;

  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const fields = Array.from(form.querySelectorAll<Field>('[required]'));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const errorEl = (field: Field): HTMLElement | null =>
    field.parentElement?.querySelector<HTMLElement>('[data-error]') ?? null;

  const messageFor = (field: Field): string => {
    const v = field.validity;
    if (v.valueMissing) return field.dataset.errorRequired ?? 'Ce champ est requis.';
    if (v.typeMismatch && field.type === 'email') {
      return field.value.includes('@')
        ? 'Adresse email invalide (ex. : nom@domaine.fr).'
        : 'Il manque le « @ » dans votre email.';
    }
    return 'Valeur invalide.';
  };

  const shake = (el: HTMLElement): void => {
    if (prefersReduced) return;
    el.classList.remove('shake');
    void el.offsetWidth; // force le reflow → l'animation repart de zéro
    el.classList.add('shake');
  };

  const showFieldError = (field: Field): void => {
    const el = errorEl(field);
    if (el) {
      el.textContent = messageFor(field);
      el.classList.remove('hidden');
    }
    field.setAttribute('aria-invalid', 'true');
    shake(field);
  };

  const clearFieldError = (field: Field): void => {
    const el = errorEl(field);
    if (el) {
      el.textContent = '';
      el.classList.add('hidden');
    }
    field.removeAttribute('aria-invalid');
  };

  const setStatus = (message: string, type: 'success' | 'error'): void => {
    if (!status) return;
    status.textContent = message;
    status.classList.remove('hidden', 'text-orange', 'text-danger');
    status.classList.add(type === 'success' ? 'text-orange' : 'text-danger');
  };

  const clearStatus = (): void => {
    if (!status) return;
    status.textContent = '';
    status.classList.add('hidden');
  };

  // Retire .shake en fin d'anim (fonctionne pour n'importe quel champ)
  form.addEventListener('animationend', (e) => (e.target as HTMLElement).classList.remove('shake'));

  // Efface l'erreur d'un champ dès qu'il redevient valide (au fil de la saisie)
  fields.forEach((field) => {
    field.addEventListener('input', () => {
      if (field.checkValidity()) clearFieldError(field);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearStatus();

    const invalid = fields.filter((field) => !field.checkValidity());
    fields.forEach((field) => (invalid.includes(field) ? showFieldError(field) : clearFieldError(field)));

    if (invalid.length > 0) {
      invalid[0].focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      const result = (await response.json()) as { success?: boolean };

      if (result.success) {
        setStatus('Merci pour votre message. Je répond en 24h maximum !', 'success');
        form.reset();
        fields.forEach(clearFieldError);
      } else {
        setStatus('Une erreur est survenue, veuillez réessayer.', 'error');
      }
    } catch {
      setStatus('Une erreur est survenue, veuillez réessayer.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

initContactForm();
