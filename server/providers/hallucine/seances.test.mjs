import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTownFeatures, townKey } from './seances.js';

const NOW = Date.parse('2026-07-15T12:00:00Z');
const s = (commune, date, titre, cp = '33000') => ({
  pays: 'FR',
  codePostal: cp,
  commune,
  dateDebut: date,
  titre,
  urlSource: `https://example.org/${titre}`,
});

test('one point per town, counting its screenings and naming the next one', () => {
  const seances = [
    s('Bordeaux', '2026-07-01T20:00:00Z', 'Passé'),
    s('Bordeaux', '2026-07-20T20:00:00Z', 'Prochain'),
    s('Bordeaux', '2026-08-02T20:00:00Z', 'Après'),
  ];
  const [feature, ...rest] = buildTownFeatures(
    seances,
    () => [44.84, -0.58],
    NOW,
  );
  assert.equal(rest.length, 0);
  assert.deepEqual(feature.geometry.coordinates, [-0.58, 44.84]);
  assert.equal(feature.properties.name, 'Bordeaux');
  assert.equal(feature.properties.count, 3);
  assert.equal(feature.properties.upcoming, true);
  assert.deepEqual(feature.properties.details, ['🎬 3', '▶ 20/07 · Prochain']);
});

test('a town whose season is over shows its last screening', () => {
  const [feature] = buildTownFeatures(
    [s('Pau', '2026-06-01T20:00:00Z', 'Fini', '64000')],
    () => [43.3, -0.37],
    NOW,
  );
  assert.equal(feature.properties.upcoming, false);
  assert.equal(feature.properties.details[1], '◷ 01/06 · Fini');
});

test('a town without coordinates is left out, never placed at 0,0', () => {
  assert.deepEqual(
    buildTownFeatures(
      [s('Nulle-Part', '2026-07-20T20:00:00Z', 'X')],
      () => null,
      NOW,
    ),
    [],
  );
});

test('town key keeps country, postcode and name apart', () => {
  assert.equal(townKey(s('Bordeaux', '', '')), 'FR|33000|Bordeaux');
});
