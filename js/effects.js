// Появление блоков при скролле, 3D-наклон галерей, лайтбокс, разбивка заголовка на буквы.
import { t, pick } from './i18n.js';
import { photoUrl } from './dom.js';

const TILT_MAX_DEG = 7;

export function createRevealer(reducedMotion) {
  if (reducedMotion || !('IntersectionObserver' in window)) {
    return (root = document) => root.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
  }
  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }),
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  return (root = document) => root.querySelectorAll('.reveal:not(.is-in)').forEach((el) => observer.observe(el));
}

/** Делегированный наклон: работает и для элементов, перерисованных после смены языка. */
export function initTilt(reducedMotion) {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
  let active = null;
  let frame = 0;
  let pending = null;

  const apply = () => {
    frame = 0;
    if (!pending) return;
    const { el, x, y } = pending;
    el.style.setProperty('--ry', `${(x * TILT_MAX_DEG).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-y * TILT_MAX_DEG).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${((x + 1) * 50).toFixed(1)}%`);
    el.style.setProperty('--my', `${((y + 1) * 50).toFixed(1)}%`);
  };

  document.addEventListener('pointermove', (event) => {
    const el = event.target.closest?.('[data-tilt]');
    if (active && active !== el) {
      active.classList.remove('is-tilting');
      active.style.setProperty('--rx', '0deg');
      active.style.setProperty('--ry', '0deg');
    }
    active = el;
    if (!el) return;
    el.classList.add('is-tilting');
    const rect = el.getBoundingClientRect();
    pending = { el, x: ((event.clientX - rect.left) / rect.width) * 2 - 1, y: ((event.clientY - rect.top) / rect.height) * 2 - 1 };
    if (!frame) frame = requestAnimationFrame(apply);
  }, { passive: true });
}

export function splitChars(el) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  const chars = [...text].map((char, index) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--i', String(index));
    span.textContent = char === ' ' ? ' ' : char;
    return span;
  });
  el.replaceChildren(...chars);
}

/** @param {HTMLDialogElement} dialog */
export function initLightbox(dialog) {
  const img = dialog.querySelector('[data-lb-img]');
  const caption = dialog.querySelector('[data-lb-cap]');
  const counter = dialog.querySelector('[data-lb-count]');
  let photos = [];
  let index = 0;

  const show = (next) => {
    index = (next + photos.length) % photos.length;
    const photo = photos[index];
    img.src = photoUrl(photo.src);
    img.alt = pick(photo.cap);
    caption.textContent = pick(photo.cap);
    counter.textContent = `${index + 1} / ${photos.length}`;
  };

  dialog.querySelector('[data-lb-prev]').addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lb-next]').addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-lb-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });

  return {
    open(tour, startIndex = 0) {
      photos = tour.photos;
      dialog.querySelector('[data-lb-title]').textContent = pick(tour.title);
      show(startIndex);
      dialog.showModal();
    },
    refresh() {
      if (dialog.open) show(index);
      dialog.querySelector('[data-lb-close]').setAttribute('aria-label', t('lightbox.close'));
    },
  };
}
