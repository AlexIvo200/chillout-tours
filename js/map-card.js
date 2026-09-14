// Карточка точки маршрута на 3D-карте: фото, название и короткая справка.
// Точки, склеенные на карте в одну метку, листаются полосками или стрелками с клавиатуры.
import { h, photoUrl } from './dom.js';
import { pick } from './i18n.js';

const HIDE_DELAY_MS = 220;
const EDGE_PX = 12;
const GAP_PX = 14;
const DOCK_QUERY = '(max-width: 560px)';

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * @typedef {{ name: {ru: string, en: string}, about: {ru: string, en: string}, photo: string }} MapStop
 * @typedef {{ el: HTMLElement, card: { stops: () => MapStop[], kicker: () => string, color: () => string } }} CardOwner
 * @param {HTMLElement} stage
 */
export function createMapCard(stage) {
  const img = h('img', { class: 'map-card__img', alt: '', width: 760, height: 428, decoding: 'async' });
  const kicker = h('p', { class: 'map-card__kicker' });
  const title = h('p', { class: 'map-card__title' });
  const about = h('p', { class: 'map-card__about' });
  const dots = h('div', { class: 'map-card__dots' });
  const el = h('div', { class: 'map-card', id: 'mapCard', tabindex: '-1', 'aria-live': 'polite' },
    h('div', { class: 'map-card__inner' }, [
      h('div', { class: 'map-card__media' }, img),
      h('div', { class: 'map-card__body' }, [kicker, title, about, dots]),
    ]),
  );
  stage.append(el);

  const docked = window.matchMedia(DOCK_QUERY);
  /** @type {CardOwner|null} */
  let owner = null;
  let index = 0;
  let hideTimer = 0;

  const cancelClose = () => clearTimeout(hideTimer);
  const scheduleClose = () => {
    cancelClose();
    hideTimer = setTimeout(close, HIDE_DELAY_MS);
  };

  function paint() {
    const stops = owner.card.stops();
    const stop = stops[index];
    img.src = photoUrl(stop.photo, true);
    img.alt = pick(stop.name);
    const counter = stops.length > 1 ? ` · ${index + 1}/${stops.length}` : '';
    kicker.textContent = `${owner.card.kicker()}${counter}`;
    title.textContent = pick(stop.name);
    about.textContent = pick(stop.about);
    [...dots.children].forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
  }

  // Полоски строятся один раз на открытие: пересоздание под курсором снова вызвало бы pointerenter.
  function buildDots() {
    const stops = owner.card.stops();
    dots.hidden = stops.length < 2;
    dots.replaceChildren(...(stops.length < 2 ? [] : stops.map((stop, i) => h('button', {
      class: 'map-card__dot',
      type: 'button',
      'aria-label': pick(stop.name),
      onpointerenter: (event) => { if (event.pointerType === 'mouse') show(i); },
      onclick: () => show(i),
    }))));
  }

  function show(nextIndex) {
    if (!owner) return;
    const count = owner.card.stops().length;
    index = (nextIndex + count) % count;
    paint();
  }

  function open(item) {
    cancelClose();
    if (owner !== item) {
      owner?.el.setAttribute('aria-expanded', 'false');
      owner = item;
      index = 0;
      el.style.setProperty('--tour', item.card.color());
      buildDots();
      paint();
    }
    item.el.setAttribute('aria-expanded', 'true');
    el.classList.add('is-open');
    follow();
  }

  function close() {
    cancelClose();
    owner?.el.setAttribute('aria-expanded', 'false');
    owner = null;
    el.classList.remove('is-open');
  }

  /** Держит карточку рядом с меткой, пока камера двигается. На узком экране карточка прижата к низу. */
  function follow() {
    if (!owner) return;
    if (docked.matches) {
      el.style.transform = '';
      return;
    }
    const stageRect = stage.getBoundingClientRect();
    const anchor = owner.el.getBoundingClientRect();
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const left = anchor.left - stageRect.left;
    const right = anchor.right - stageRect.left;
    const roomRight = stageRect.width - right - GAP_PX - EDGE_PX;
    const roomLeft = left - GAP_PX - EDGE_PX;
    const toLeft = roomRight < width && roomLeft > roomRight;
    const x = clamp(toLeft ? left - GAP_PX - width : right + GAP_PX, EDGE_PX, stageRect.width - width - EDGE_PX);
    const y = clamp(anchor.top - stageRect.top + anchor.height / 2 - height / 2, EDGE_PX, stageRect.height - height - EDGE_PX);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.classList.toggle('is-left', toLeft);
  }

  el.addEventListener('pointerenter', cancelClose);
  el.addEventListener('pointerleave', (event) => { if (event.pointerType === 'mouse') scheduleClose(); });
  el.addEventListener('focusout', (event) => {
    if (!el.contains(event.relatedTarget) && event.relatedTarget !== owner?.el) scheduleClose();
  });
  el.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  document.addEventListener('pointerdown', (event) => {
    if (!owner || el.contains(event.target) || event.target.closest?.('.map-label')) return;
    close();
  });

  return {
    open,
    close,
    scheduleClose,
    follow,
    step: (delta) => show(index + delta),
    refresh: () => {
      if (!owner) return;
      buildDots();
      paint();
    },
    isOpenFor: (item) => owner === item,
    contains: (node) => el.contains(node),
  };
}
