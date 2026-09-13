// Чистая логика заявки: валидация, текст сообщения, ссылка на мессенджер. Без DOM.
export const PEOPLE_MIN = 1;
export const PEOPLE_MAX = 18; // мест в Mercedes Sprinter
export const NAME_MIN = 2;
export const NAME_MAX = 60;
export const MESSENGERS = Object.freeze(['whatsapp', 'viber', 'telegram']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toISODate(date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!ISO_DATE.test(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function validateBooking(input, knownTourIds, todayISO) {
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  const people = Number(input.people);
  const date = String(input.date ?? '');
  const errors = {};

  if (!knownTourIds.includes(input.tourId)) errors.tour = 'err.tour';
  if (!ISO_DATE.test(date) || date < todayISO) errors.date = 'err.date';
  if (!Number.isInteger(people) || people < PEOPLE_MIN || people > PEOPLE_MAX) errors.people = 'err.people';
  if (name.length < NAME_MIN || name.length > NAME_MAX) errors.name = 'err.name';
  if (!MESSENGERS.includes(input.via)) errors.via = 'err.via';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { tourId: input.tourId, date, people, name, via: input.via },
  };
}

/** translate: функция key -> строка на текущем языке. */
export function buildMessage({ tourTitle, price, date, people, name }, translate) {
  return [
    translate('msg.hello'),
    `${translate('msg.tour')}: ${tourTitle} (${price} ₾)`,
    `${translate('msg.date')}: ${formatDate(date)}`,
    `${translate('msg.people')}: ${people}`,
    `${translate('msg.name')}: ${name}`,
  ].join('\n');
}

export function buildMessengerLink(via, phoneE164, text) {
  if (!/^\d{8,15}$/.test(phoneE164)) throw new Error(`Invalid phone: ${phoneE164}`);
  switch (via) {
    case 'whatsapp':
      return `https://wa.me/${phoneE164}?text=${encodeURIComponent(text)}`;
    case 'viber':
      return `viber://chat?number=%2B${phoneE164}`;
    case 'telegram':
      return `https://t.me/+${phoneE164}`;
    default:
      throw new Error(`Unknown messenger: ${via}`);
  }
}

/** Только WhatsApp умеет принимать текст в ссылке, для остальных текст копируем. */
export const messengerAcceptsText = (via) => via === 'whatsapp';
