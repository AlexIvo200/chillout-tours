// Рендер туров: редакционные «главы» с 3D-галереей, список для карты и опции формы.
import { TOURS } from './tours-data.js';
import { t, pick } from './i18n.js';
import { h, icon, photoUrl } from './dom.js';
import { clusterStops } from './geo.js';

function priceBlock(tour) {
  return h('div', { class: 'tour__price' }, [
    h('span', { class: 'tour__badge' }, [h('span', { class: 'tour__badge-dot', 'aria-hidden': 'true' }), pick(tour.badge)]),
    h('p', { class: 'price' }, [
      tour.oldPrice ? h('s', { class: 'price__old', text: `${tour.oldPrice} ₾` }) : null,
      h('strong', { class: 'price__now', text: String(tour.price) }),
      h('span', { class: 'price__cur', text: '₾' }),
    ]),
    h('small', { class: 'price__note', text: t('tour.perPerson') }),
  ]);
}

function gallery(tour, onOpenPhoto) {
  const photos = tour.photos;
  let current = 0;

  const mainImg = h('img', { src: photoUrl(photos[0].src), alt: pick(photos[0].cap), width: 1600, height: 1067, loading: 'lazy', decoding: 'async' });
  const caption = h('figcaption', { class: 'tour__caption', text: pick(photos[0].cap) });
  const back1 = h('img', { class: 'tour__card tour__card--1', src: photoUrl(photos[1].src, true), alt: '', width: 760, height: 507, loading: 'lazy' });
  const back2 = h('img', { class: 'tour__card tour__card--2', src: photoUrl(photos[2].src, true), alt: '', width: 760, height: 507, loading: 'lazy' });

  const thumbs = photos.map((photo, index) =>
    h('li', {}, h('button', {
      class: 'tour__thumb',
      type: 'button',
      'aria-label': pick(photo.cap),
      'aria-current': index === 0 ? 'true' : null,
      onclick: () => show(index),
    }, h('img', { src: photoUrl(photo.src, true), alt: '', width: 760, height: 507, loading: 'lazy' }))),
  );

  function show(index) {
    current = index;
    const photo = photos[index];
    mainImg.classList.remove('is-swapping');
    void mainImg.offsetWidth; // перезапуск анимации смены кадра
    mainImg.classList.add('is-swapping');
    mainImg.src = photoUrl(photo.src);
    mainImg.alt = pick(photo.cap);
    caption.textContent = pick(photo.cap);
    back1.src = photoUrl(photos[(index + 1) % photos.length].src, true);
    back2.src = photoUrl(photos[(index + 2) % photos.length].src, true);
    thumbs.forEach((li, i) => li.firstChild.toggleAttribute('aria-current', i === index));
  }

  return h('div', { class: 'tour__gallery', 'data-tilt': true }, [
    h('div', { class: 'tour__stage' }, [
      back2,
      back1,
      h('figure', { class: 'tour__main' }, [
        h('button', { class: 'tour__zoom', type: 'button', 'aria-label': `${t('tour.photos')}: ${pick(tour.title)}`, onclick: () => onOpenPhoto(tour, current) }, mainImg),
        caption,
      ]),
      h('span', { class: 'tour__ka-float', lang: 'ka', 'aria-hidden': 'true', text: tour.ka }),
    ]),
    h('ul', { class: 'tour__thumbs', 'aria-label': t('tour.photos') }, thumbs),
  ]);
}

function infoColumn(tour, onBook) {
  return h('div', { class: 'tour__info' }, [
    h('p', { class: 'tour__lead', text: pick(tour.lead) }),
    h('dl', { class: 'tour__facts' }, tour.facts.map((f) => h('div', {}, [h('dt', { text: pick(f.k) }), h('dd', { text: pick(f.v) })]))),
    h('h4', { class: 'tour__subhead', text: t('tour.route') }),
    h('ol', { class: 'tour__route' }, tour.stops.map((stop) => h('li', {}, h('span', { text: pick(stop.name) })))),
    h('div', { class: 'tour__costs' }, [
      h('section', { class: 'costs costs--in' }, [
        h('h4', { class: 'tour__subhead', text: t('tour.included') }),
        h('ul', {}, tour.included.map((item) => h('li', {}, [icon('check'), pick(item)]))),
      ]),
      h('section', { class: 'costs costs--extra' }, [
        h('h4', { class: 'tour__subhead', text: t('tour.extra') }),
        h('ul', {}, tour.extra.map((item) => h('li', {}, [icon('coin'), pick(item)]))),
      ]),
    ]),
    h('button', { class: 'btn btn--tour', type: 'button', onclick: () => onBook(tour.id) }, [
      h('span', { text: `${t('tour.book')} · ${tour.price} ₾` }),
      h('span', { class: 'btn__orb' }, icon('arrow')),
    ]),
  ]);
}

function tourArticle(tour, index, { onBook, onOpenPhoto }) {
  return h('article', {
    class: 'tour',
    id: `tour-${tour.id}`,
    'data-flip': index % 2 === 1 ? 'true' : null,
    style: { '--tour': tour.color },
    'aria-labelledby': `tour-title-${tour.id}`,
  }, [
    h('header', { class: 'tour__head reveal' }, [
      h('span', { class: 'tour__num', 'aria-hidden': 'true', text: tour.num }),
      h('div', { class: 'tour__titles' }, [
        h('p', { class: 'tour__ka', lang: 'ka', text: tour.ka }),
        h('h3', { class: 'tour__title', id: `tour-title-${tour.id}`, text: pick(tour.title) }),
        h('p', { class: 'tour__tagline', text: pick(tour.tagline) }),
      ]),
      priceBlock(tour),
    ]),
    h('div', { class: 'tour__body' }, [
      h('div', { class: 'reveal' }, gallery(tour, onOpenPhoto)),
      h('div', { class: 'reveal reveal--late' }, infoColumn(tour, onBook)),
    ]),
  ]);
}

export function renderTours(container, handlers) {
  container.replaceChildren(...TOURS.map((tour, index) => tourArticle(tour, index, handlers)));
}

export function renderMapList(container, { activeId, onSelect }) {
  container.replaceChildren(...TOURS.map((tour) => {
    const stops = clusterStops(tour.stops).length;
    return h('li', {}, h('button', {
      class: 'map-item',
      type: 'button',
      style: { '--tour': tour.color },
      'aria-pressed': String(tour.id === activeId),
      'data-tour': tour.id,
      onclick: () => onSelect(tour.id),
    }, [
      h('span', { class: 'map-item__num', text: tour.num }),
      h('span', { class: 'map-item__body' }, [
        h('strong', { text: pick(tour.title) }),
        h('small', { text: pick(tour.tagline) }),
      ]),
      h('span', { class: 'map-item__price' }, [String(tour.price), h('span', { text: ' ₾' })]),
      h('span', { class: 'map-item__stops', 'aria-hidden': 'true', text: '•'.repeat(Math.min(stops, 6)) }),
    ]));
  }));
}

export function fillTourSelect(select) {
  const previous = select.value;
  select.replaceChildren(...TOURS.map((tour) =>
    h('option', { value: tour.id, text: `${pick(tour.title)} · ${tour.price} ₾` }),
  ));
  if (previous) select.value = previous;
}
