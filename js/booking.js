// Форма бронирования: валидация, подсказки об ошибках, открытие мессенджера с готовым текстом.
import { TOURS, PHONE_E164 } from './tours-data.js';
import { t, pick } from './i18n.js';
import {
  PEOPLE_MIN,
  PEOPLE_MAX,
  validateBooking,
  buildMessage,
  buildMessengerLink,
  messengerAcceptsText,
  toISODate,
} from './booking-core.js';

const DAY_MS = 86_400_000;
const TOUR_IDS = TOURS.map((tour) => tour.id);

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {HTMLFormElement} form
 * @param {HTMLElement} status
 */
export function initBooking(form, status) {
  const fields = {
    tour: form.elements.namedItem('tour'),
    date: form.elements.namedItem('date'),
    people: form.elements.namedItem('people'),
    name: form.elements.namedItem('name'),
  };

  const today = toISODate(new Date());
  fields.date.min = today;
  fields.date.value = toISODate(new Date(Date.now() + DAY_MS));

  const setPeople = (value) => {
    const next = Math.min(PEOPLE_MAX, Math.max(PEOPLE_MIN, Number(value) || PEOPLE_MIN));
    fields.people.value = String(next);
  };
  form.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => setPeople(Number(fields.people.value) + Number(button.dataset.step)));
  });
  fields.people.addEventListener('change', () => setPeople(fields.people.value));

  const showErrors = (errors) => {
    form.querySelectorAll('[data-error-for]').forEach((slot) => {
      const key = errors[slot.dataset.errorFor];
      slot.textContent = key ? t(key) : '';
      const control = fields[slot.dataset.errorFor];
      control?.toggleAttribute('aria-invalid', Boolean(key));
    });
  };

  const setStatus = (message, tone = 'ok') => {
    status.textContent = message;
    status.dataset.tone = tone;
  };

  form.addEventListener('input', (event) => {
    const slot = form.querySelector(`[data-error-for="${event.target.name}"]`);
    if (slot?.textContent) {
      slot.textContent = '';
      event.target.removeAttribute('aria-invalid');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const result = validateBooking(
      {
        tourId: data.get('tour'),
        date: data.get('date'),
        people: Number(data.get('people')),
        name: data.get('name'),
        via: data.get('via'),
      },
      TOUR_IDS,
      toISODate(new Date()),
    );
    showErrors(result.errors);
    if (!result.ok) {
      setStatus('', 'idle');
      form.querySelector('[aria-invalid]')?.focus();
      return;
    }

    const { value } = result;
    const tour = TOURS.find((item) => item.id === value.tourId);
    const text = buildMessage({ tourTitle: pick(tour.title), price: tour.price, ...value }, t);
    const link = buildMessengerLink(value.via, PHONE_E164, text);

    if (messengerAcceptsText(value.via)) {
      setStatus(t('ok.sent'));
    } else {
      const copied = await copyText(text);
      setStatus(copied ? t('ok.copied') : t('ok.sent'));
    }
    window.open(link, '_blank', 'noopener');
  });

  return {
    setTour(id) {
      if (TOUR_IDS.includes(id)) fields.tour.value = id;
    },
    focusFirst() {
      fields.date.focus({ preventScroll: true });
    },
    resetMessages() {
      showErrors({});
      setStatus('', 'idle');
    },
  };
}
