(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // Smoothly reveal sections while keeping content visible for search engines and reduced-motion users.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
    $$('.content-section, .pass-section, .tournament-page-section, .booking-section, .game-vault-section, .location-section, .trust-strip, .promo-live-banner').forEach(el => {
      if (!el.classList.contains('hidden')) { el.classList.add('neo-reveal'); revealObserver.observe(el); }
    });
  }

  // A single accessible lightbox for all game and setup artwork. Existing booking buttons remain untouched.
  const lightbox = document.createElement('div');
  lightbox.className = 'neo-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Expanded game artwork');
  lightbox.innerHTML = `
    <div class="neo-lightbox-dialog" role="document">
      <button type="button" class="neo-lightbox-close" aria-label="Close expanded image">×</button>
      <div class="neo-lightbox-media"><img alt="" src=""></div>
      <div class="neo-lightbox-meta"><span class="neo-lightbox-kicker">ARTWORK PREVIEW / FULL VIEW</span><h2 class="neo-lightbox-title">Explore the game</h2><p class="neo-lightbox-copy">Take a closer look. Close the preview to continue browsing the cafe.</p><a class="neo-lightbox-cta" href="/book">Reserve your station ↗</a></div>
    </div>`;
  document.body.appendChild(lightbox);
  const modalImage = $('img', lightbox), modalTitle = $('.neo-lightbox-title', lightbox), modalClose = $('.neo-lightbox-close', lightbox);
  let lastFocused = null;
  function openLightbox(img, title = '') {
    if (!img || !img.src) return;
    lastFocused = document.activeElement;
    modalImage.src = img.currentSrc || img.src;
    modalImage.alt = img.alt || title || 'Expanded game artwork';
    modalTitle.textContent = title || img.alt || 'Game artwork';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modalClose.focus({preventScroll:true});
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    modalImage.src = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus({preventScroll:true});
  }
  modalClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
    if (e.key === 'Tab' && lightbox.classList.contains('is-open')) {
      e.preventDefault(); modalClose.focus();
    }
  });

  function makeZoomable(target, img, title) {
    if (!target || !img || target.dataset.neoZoomBound === '1') return;
    target.dataset.neoZoomBound = '1';
    target.classList.add('zoomable-image');
    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');
    target.setAttribute('aria-label', `Expand image: ${title || img.alt || 'game artwork'}`);
    target.addEventListener('click', e => {
      // Clicking an image on a setup card previews artwork; buttons on the card continue to book.
      if (e.target.closest('button,a')) return;
      openLightbox(img, title || img.alt || 'Game artwork');
    });
    target.addEventListener('keydown', e => {
      if (e.target === target && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLightbox(img, title || img.alt); }
    });
  }
  function bindZoomables() {
    $$('.poster-card').forEach(card => makeZoomable(card, $('img', card), $('.poster-tag', card)?.textContent.trim()));
    $$('.marquee-game-card').forEach(card => makeZoomable(card, $('img', card) || card, $('span', card)?.textContent.trim()));
    $$('.booking-setup-image').forEach(media => makeZoomable(media, $('img', media), media.closest('.booking-setup-card')?.querySelector('h5')?.textContent.trim()));
    $$('.arena-image').forEach(media => makeZoomable(media, $('img', media), media.closest('.arena-card')?.querySelector('h3')?.textContent.trim()));
  }
  bindZoomables();
  // Dynamic cards are rendered after public data loads; observer catches new nodes and binds them.
  const mutationObserver = new MutationObserver(() => bindZoomables());
  mutationObserver.observe(document.body, {childList:true, subtree:true});

  // Gentle pointer tilt on the hero cards; CSS animations remain the fallback on touch screens.
  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    $$('.poster-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        if (lightbox.classList.contains('is-open')) return;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.style.animationPlayState = 'paused';
        card.style.transform = `translateY(-5px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) rotateZ(${(x * 3).toFixed(2)}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; card.style.animationPlayState = ''; });
    });
    $$('.arena-card, .tournament-card, .menu-card, .booking-setup-card').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        card.style.setProperty('--neo-pointer-x', `${(x * 7).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => card.style.removeProperty('--neo-pointer-x'));
    });
  }

  // Allow the animated scroll cue to follow the in-page target with a soft, native scroll.
  $$('.scroll-cue[href^="#"]').forEach(link => link.addEventListener('click', e => {
    const target = $(link.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'start'}); }
  }));
})();
