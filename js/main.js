// Точка входа: язык, рендер туров, 3D-сцены (лениво), бронь, эффекты.
import { applyStaticTexts, onLangChange, setLang, getLang, t, pick } from './i18n.js';
import { TOURS } from './tours-data.js';
import { renderTours, renderMapList, fillTourSelect } from './tours-render.js';
import { initBooking } from './booking.js';
import { createRevealer, initTilt, splitChars, initLightbox } from './effects.js';
import { h } from './dom.js';

const PRELOADER_MAX_MS = 3500;
const MAP_PRELOAD_MARGIN = '600px 0px';
const MARQUEE_PLACES = [
  { ru: 'Сигнаги', en: 'Sighnaghi' },
  { ru: 'Гергети', en: 'Gergeti' },
  { ru: 'Вардзия', en: 'Vardzia' },
  { ru: 'Ананури', en: 'Ananuri' },
  { ru: 'Джвари', en: 'Jvari' },
  { ru: 'Нарикала', en: 'Narikala' },
  { ru: 'Боржоми', en: 'Borjomi' },
  { ru: 'Алазанская долина', en: 'Alazani Valley' },
  { ru: 'Уплисцихе', en: 'Uplistsikhe' },
  { ru: 'Бодбе', en: 'Bodbe' },
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (selector) => document.querySelector(selector);

const state = { activeTour: TOURS[0].id, map: null };

function hidePreloader() {
  document.body.classList.add('is-ready');
  $('#preloader')?.classList.add('is-gone');
}

function renderMarquee() {
  const items = MARQUEE_PLACES.flatMap((place) => [h('span', { text: pick(place) }), h('span', { class: 'marquee__star', 'aria-hidden': 'true', text: '✦' })]);
  const track = $('#marqueeTrack');
  track.replaceChildren(h('div', { class: 'marquee__group' }, items), h('div', { class: 'marquee__group', 'aria-hidden': 'true' }, items.map((n) => n.cloneNode(true))));
}

function splitHero() {
  document.querySelectorAll('[data-split]').forEach(splitChars);
}

async function startHero() {
  const hero = $('.hero');
  try {
    const { initHeroTerrain } = await import('./hero-terrain.js');
    initHeroTerrain($('#heroCanvas'), { onFirstFrame: hidePreloader, reducedMotion });
  } catch (error) {
    hero.classList.add('hero--fallback');
    hidePreloader();
    reportError('hero 3D unavailable', error);
  }
}

function reportError(message, error) {
  // Без внешнего логгера: пишем в консоль только как warning, UI уже переключён на фолбэк.
  console.warn(`[ChillOutTours] ${message}`, error);
}

function selectTour(id) {
  state.activeTour = id;
  document.querySelectorAll('.map-item').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.tour === id)));
  const tour = TOURS.find((item) => item.id === id);
  const open = $('#mapOpen');
  open.href = `#tour-${id}`;
  open.style.setProperty('--tour', tour.color);
  $('#mapActiveTitle').textContent = pick(tour.title);
  state.map?.select(id);
}

function startMapWhenNear() {
  const stage = $('#mapStage');
  const observer = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    try {
      const { initMap } = await import('./map3d.js');
      state.map = initMap({ stage, labels: $('#mapLabels'), reducedMotion });
      stage.classList.add('is-live');
      state.map.select(state.activeTour);
    } catch (error) {
      stage.classList.add('is-failed');
      reportError('map 3D unavailable', error);
    }
  }, { rootMargin: MAP_PRELOAD_MARGIN });
  observer.observe(stage);
}

async function loadCredits() {
  const list = $('#creditsList');
  try {
    const response = await fetch('assets/img/credits.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const credits = await response.json();
    list.replaceChildren(...Object.values(credits).map((c) =>
      h('li', {}, [
        h('a', { href: c.source, target: '_blank', rel: 'noopener', text: c.title.replace(/\.(jpe?g|png)$/i, '') }),
        ` · ${c.author || 'Wikimedia Commons'} · ${c.license}`,
      ]),
    ));
  } catch (error) {
    list.replaceChildren(h('li', {}, h('a', { href: 'https://commons.wikimedia.org', target: '_blank', rel: 'noopener', text: 'Wikimedia Commons' })));
    reportError('credits failed to load', error);
  }
}

function initHeader() {
  const header = $('#siteHeader');
  new IntersectionObserver(([entry]) => header.classList.toggle('is-scrolled', !entry.isIntersecting)).observe($('#topSentinel'));
  const toggle = $('#langToggle');
  const syncToggle = () => {
    toggle.querySelector('[data-lang-current]').textContent = getLang().toUpperCase();
    toggle.querySelector('[data-lang-next]').textContent = getLang() === 'ru' ? 'EN' : 'RU';
  };
  toggle.addEventListener('click', () => setLang(getLang() === 'ru' ? 'en' : 'ru'));
  syncToggle();
  return syncToggle;
}

function boot() {
  applyStaticTexts();
  splitHero();
  renderMarquee();

  const reveal = createRevealer(reducedMotion);
  const lightbox = initLightbox($('#lightbox'));
  const booking = initBooking($('#bookForm'), $('#formStatus'));

  const onBook = (id) => {
    booking.setTour(id);
    $('#book').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    booking.focusFirst();
  };
  const renderDynamic = () => {
    renderTours($('#toursList'), { onBook, onOpenPhoto: lightbox.open });
    renderMapList($('#mapList'), { activeId: state.activeTour, onSelect: selectTour });
    fillTourSelect($('#bookForm').elements.namedItem('tour'));
    selectTour(state.activeTour);
    reveal();
  };
  renderDynamic();

  const syncToggle = initHeader();
  onLangChange(() => {
    splitHero();
    renderMarquee();
    renderDynamic();
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    state.map?.refreshLabelText();
    lightbox.refresh();
    booking.resetMessages();
    syncToggle();
  });

  initTilt(reducedMotion);
  startHero();
  startMapWhenNear();
  loadCredits();
  setTimeout(hidePreloader, PRELOADER_MAX_MS);
}

boot();
