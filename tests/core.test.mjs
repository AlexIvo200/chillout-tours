import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBooking,
  buildMessage,
  buildMessengerLink,
  formatDate,
  toISODate,
  messengerAcceptsText,
} from '../js/booking-core.js';
import { pointInPolygon, clusterStops, project, unproject, distanceToPolyline } from '../js/geo.js';
import { GEORGIA_RING } from '../js/georgia-shape.js';

const IDS = ['kakheti', 'kazbegi'];
const TODAY = '2026-09-12';
const valid = { tourId: 'kakheti', date: '2026-09-13', people: 2, name: '  Анна  ', via: 'whatsapp' };

test('accepts a complete booking and normalises the name', () => {
  const result = validateBooking(valid, IDS, TODAY);
  assert.equal(result.ok, true);
  assert.equal(result.value.name, 'Анна');
});

test('rejects past dates, unknown tours, bad people counts and short names', () => {
  const result = validateBooking(
    { tourId: 'mars', date: '2026-09-11', people: 19, name: 'A', via: 'fax' },
    IDS,
    TODAY,
  );
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['date', 'name', 'people', 'tour', 'via']);
});

test('allows booking for today', () => {
  assert.equal(validateBooking({ ...valid, date: TODAY }, IDS, TODAY).ok, true);
});

test('rejects fractional and zero people', () => {
  assert.equal(validateBooking({ ...valid, people: 1.5 }, IDS, TODAY).errors.people, 'err.people');
  assert.equal(validateBooking({ ...valid, people: 0 }, IDS, TODAY).errors.people, 'err.people');
});

test('builds a readable message with a formatted date', () => {
  const text = buildMessage(
    { tourTitle: 'Кахетия', price: 60, date: '2026-09-13', people: 2, name: 'Анна' },
    (key) => key,
  );
  assert.match(text, /msg\.tour: Кахетия \(60 ₾\)/);
  assert.match(text, /13\.09\.2026/);
});

test('encodes text into the WhatsApp link only', () => {
  assert.equal(
    buildMessengerLink('whatsapp', '995555308785', 'a b&c'),
    'https://wa.me/995555308785?text=a%20b%26c',
  );
  assert.equal(buildMessengerLink('telegram', '995555308785', 'x'), 'https://t.me/+995555308785');
  assert.equal(messengerAcceptsText('viber'), false);
  assert.throws(() => buildMessengerLink('pigeon', '995555308785', 'x'));
  assert.throws(() => buildMessengerLink('whatsapp', '+99 5', 'x'));
});

test('formatDate leaves unexpected input untouched', () => {
  assert.equal(formatDate('soon'), 'soon');
  assert.equal(toISODate(new Date(2026, 0, 5, 12)), '2026-01-05');
});

test('Tbilisi and Kazbegi are inside Georgia, Yerevan and Sochi are not', () => {
  assert.equal(pointInPolygon(44.8271, 41.7151, GEORGIA_RING), true);
  assert.equal(pointInPolygon(44.6433, 42.6566, GEORGIA_RING), true);
  assert.equal(pointInPolygon(44.5152, 40.1872, GEORGIA_RING), false);
  assert.equal(pointInPolygon(39.72, 43.6, GEORGIA_RING), false);
});

test('project and unproject are inverse', () => {
  const { x, z } = project(45.1, 41.9);
  const back = unproject(x, z);
  assert.ok(Math.abs(back.lon - 45.1) < 1e-9);
  assert.ok(Math.abs(back.lat - 41.9) < 1e-9);
});

test('clusterStops merges nearby stops and keeps order', () => {
  const stops = [
    { lat: 41.6186, lon: 45.9217, id: 'sighnaghi' },
    { lat: 41.6067, lon: 45.9336, id: 'bodbe' },
    { lat: 41.9198, lon: 45.4731, id: 'telavi' },
  ];
  const clusters = clusterStops(stops);
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].members.length, 2);
  assert.equal(clusters[1].anchor.id, 'telavi');
  assert.equal(stops.length, 3, 'input is not mutated');
});

test('distanceToPolyline is zero on the line', () => {
  assert.ok(distanceToPolyline(43, 42, [[42, 42], [44, 42]]) < 1e-9);
});
