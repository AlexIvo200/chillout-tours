// Словарь интерфейса и переключение языка (RU по умолчанию, EN по кнопке или ?lang=en).
const STORAGE_KEY = 'chillout-lang';
const SUPPORTED = ['ru', 'en'];

const DICT = {
  ru: {
    'meta.title': 'ChillOutTours · Туры по Грузии из Тбилиси',
    'nav.main': 'Основная навигация',
    'nav.map': 'Карта',
    'nav.tours': 'Туры',
    'nav.how': 'Как едем',
    'nav.book': 'Бронь',
    'hero.eyebrow': 'Туры по Грузии · Tours in Georgia',
    'hero.line1': 'Грузия',
    'hero.line2': 'в режиме chill',
    'hero.sub': 'Групповые туры из Тбилиси каждый день. Кахетия, Казбеги, Боржоми, Мцхета и Старый город. Садитесь в Sprinter, дорогу, гида и истории мы берём на себя.',
    'hero.cta': 'Выбрать тур',
    'hero.cta2': 'Написать в WhatsApp',
    'hero.stat1': 'маршрутов',
    'hero.stat2': 'выезд',
    'hero.stat3': 'от',
    'hero.stat4': 'комфортный',
    'hero.scroll': 'Листайте',
    'map.eyebrow': 'Карта маршрутов',
    'map.title': 'Вся Грузия за пять поездок',
    'map.text': 'Все туры стартуют в Тбилиси. Выберите маршрут, и он загорится на карте.',
    'map.hint': 'Потяните карту, чтобы повернуть',
    'map.open': 'Открыть тур',
    'tours.eyebrow': 'Групповые туры',
    'tours.title': 'Куда поедем',
    'tours.text': 'Цены в лари за человека. Всё, что оплачивается на месте, написано честно и заранее.',
    'tour.route': 'Маршрут',
    'tour.included': 'Включено',
    'tour.extra': 'Оплачивается отдельно',
    'tour.book': 'Забронировать',
    'tour.perPerson': 'за человека',
    'tour.photos': 'Фото',
    'how.eyebrow': 'Как проходит день',
    'how.title': 'Вы отдыхаете, мы рулим',
    'how.s1.t': 'Пишете нам',
    'how.s1.d': 'В WhatsApp, Viber или по телефону. Подтверждаем места и присылаем точку сбора.',
    'how.s2.t': '09:00 · выезд',
    'how.s2.d': 'Садимся в Mercedes Sprinter. Гид рассказывает, вы смотрите в окно.',
    'how.s3.t': 'Остановки и обед',
    'how.s3.d': 'Монастыри, крепости, виды и ресторан с грузинской кухней по пути.',
    'how.s4.t': 'Вечером в Тбилиси',
    'how.s4.d': 'Возвращаемся к 20:00–21:00 с полной памятью телефона.',
    'perk.daily.t': 'Каждый день',
    'perk.daily.d': 'Выезды без выходных, места есть даже на завтра.',
    'perk.car.t': 'Mercedes Sprinter',
    'perk.car.d': 'Кондиционер, удобные кресла, панорамные окна.',
    'perk.guide.t': 'Профессиональные гиды',
    'perk.guide.d': 'Легенды, история и лучшие точки для фото.',
    'perk.price.t': 'Цены без сюрпризов',
    'perk.price.d': 'Билеты и обед указаны заранее, в лари.',
    'book.eyebrow': 'Бронирование',
    'book.title': 'Займите место в Sprinter',
    'book.text': 'Заполните форму, и мы откроем мессенджер с готовым сообщением. Остаётся нажать «Отправить».',
    'book.call': 'Или позвоните',
    'form.tour': 'Тур',
    'form.date': 'Дата',
    'form.people': 'Сколько человек',
    'form.name': 'Ваше имя',
    'form.namePh': 'Например, Анна',
    'form.via': 'Куда написать',
    'form.submit': 'Отправить заявку',
    'form.minus': 'Меньше',
    'form.plus': 'Больше',
    'err.name': 'Введите имя, от 2 до 60 символов',
    'err.date': 'Выберите дату не раньше сегодняшней',
    'err.people': 'От 1 до 18 человек',
    'err.tour': 'Выберите тур',
    'err.via': 'Выберите мессенджер',
    'ok.sent': 'Открываем мессенджер. Если окно не открылось, позвоните нам.',
    'ok.copied': 'Текст заявки скопирован: вставьте его в чат и отправьте.',
    'map.sea': 'Чёрное море',
    'map.kazbek': 'Казбек · 5047 м',
    'map.loading': 'Собираем горы…',
    'msg.hello': 'Здравствуйте! Хочу забронировать тур.',
    'msg.tour': 'Тур',
    'msg.date': 'Дата',
    'msg.people': 'Человек',
    'msg.name': 'Имя',
    'lightbox.close': 'Закрыть',
    'lightbox.prev': 'Предыдущее фото',
    'lightbox.next': 'Следующее фото',
    'footer.tag': 'Групповые туры по Грузии из Тбилиси',
    'footer.credits': 'Фото: Wikimedia Commons, авторы и лицензии',
    'footer.rights': 'Все туры из Тбилиси',
    'lang.switch': 'Switch to English',
  },
  en: {
    'meta.title': 'ChillOutTours · Group tours in Georgia from Tbilisi',
    'nav.main': 'Main navigation',
    'nav.map': 'Map',
    'nav.tours': 'Tours',
    'nav.how': 'The day',
    'nav.book': 'Book',
    'hero.eyebrow': 'Tours in Georgia · Туры по Грузии',
    'hero.line1': 'Georgia',
    'hero.line2': 'in chill mode',
    'hero.sub': 'Group tours from Tbilisi every day. Kakheti, Kazbegi, Borjomi, Mtskheta and the Old Town. Hop into the Sprinter: the road, the guide and the stories are on us.',
    'hero.cta': 'Pick a tour',
    'hero.cta2': 'Message on WhatsApp',
    'hero.stat1': 'routes',
    'hero.stat2': 'departure',
    'hero.stat3': 'from',
    'hero.stat4': 'comfy',
    'hero.scroll': 'Scroll',
    'map.eyebrow': 'Route map',
    'map.title': 'All of Georgia in five trips',
    'map.text': 'Every tour starts in Tbilisi. Pick a route and watch it light up on the map.',
    'map.hint': 'Drag the map to rotate',
    'map.open': 'Open tour',
    'tours.eyebrow': 'Group tours',
    'tours.title': 'Where we go',
    'tours.text': 'Prices in lari per person. Everything paid on the spot is listed up front.',
    'tour.route': 'Route',
    'tour.included': 'Included',
    'tour.extra': 'Paid separately',
    'tour.book': 'Book now',
    'tour.perPerson': 'per person',
    'tour.photos': 'Photos',
    'how.eyebrow': 'How the day goes',
    'how.title': 'You relax, we drive',
    'how.s1.t': 'Message us',
    'how.s1.d': 'WhatsApp, Viber or a call. We confirm your seats and send the meeting point.',
    'how.s2.t': '09:00 · departure',
    'how.s2.d': 'Board the Mercedes Sprinter. The guide talks, you watch the view.',
    'how.s3.t': 'Stops & lunch',
    'how.s3.d': 'Monasteries, fortresses, viewpoints and a Georgian restaurant on the way.',
    'how.s4.t': 'Evening in Tbilisi',
    'how.s4.d': 'Back by 20:00–21:00 with a phone full of photos.',
    'perk.daily.t': 'Every day',
    'perk.daily.d': 'Departures seven days a week, often with seats for tomorrow.',
    'perk.car.t': 'Mercedes Sprinter',
    'perk.car.d': 'Air conditioning, comfy seats, big windows.',
    'perk.guide.t': 'Professional guides',
    'perk.guide.d': 'Legends, history and the best photo spots.',
    'perk.price.t': 'No surprise costs',
    'perk.price.d': 'Tickets and lunch are listed up front, in lari.',
    'book.eyebrow': 'Booking',
    'book.title': 'Grab a seat in the Sprinter',
    'book.text': 'Fill in the form and we will open your messenger with a ready message. Just hit Send.',
    'book.call': 'Or give us a call',
    'form.tour': 'Tour',
    'form.date': 'Date',
    'form.people': 'People',
    'form.name': 'Your name',
    'form.namePh': 'e.g. Anna',
    'form.via': 'Send via',
    'form.submit': 'Send request',
    'form.minus': 'Fewer',
    'form.plus': 'More',
    'err.name': 'Enter a name, 2 to 60 characters',
    'err.date': 'Pick today or a later date',
    'err.people': 'From 1 to 18 people',
    'err.tour': 'Pick a tour',
    'err.via': 'Pick a messenger',
    'ok.sent': 'Opening your messenger. If nothing happens, give us a call.',
    'ok.copied': 'Request text copied: paste it into the chat and send.',
    'map.sea': 'Black Sea',
    'map.kazbek': 'Kazbek · 5047 m',
    'map.loading': 'Raising the mountains…',
    'msg.hello': 'Hello! I would like to book a tour.',
    'msg.tour': 'Tour',
    'msg.date': 'Date',
    'msg.people': 'People',
    'msg.name': 'Name',
    'lightbox.close': 'Close',
    'lightbox.prev': 'Previous photo',
    'lightbox.next': 'Next photo',
    'footer.tag': 'Group tours in Georgia from Tbilisi',
    'footer.credits': 'Photos: Wikimedia Commons, authors and licenses',
    'footer.rights': 'All tours depart from Tbilisi',
    'lang.switch': 'Переключить на русский',
  },
};

function readInitialLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED.includes(fromUrl)) return fromUrl;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
  } catch {
    // хранилище недоступно (приватный режим), остаёмся на русском
  }
  return 'ru';
}

let currentLang = readInitialLang();
const listeners = new Set();

export const getLang = () => currentLang;

export function t(key) {
  return DICT[currentLang][key] ?? DICT.ru[key] ?? key;
}

/** Берёт нужный язык из объекта вида { ru, en }. */
export function pick(localized) {
  return localized?.[currentLang] ?? localized?.ru ?? '';
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyStaticTexts(root = document) {
  document.documentElement.lang = currentLang;
  document.title = t('meta.title');
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    });
  });
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang) || lang === currentLang) return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // не критично: язык просто не запомнится
  }
  applyStaticTexts();
  listeners.forEach((fn) => fn(lang));
}
