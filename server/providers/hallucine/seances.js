import fs from 'node:fs';
import path from 'node:path';

/**
 * Hallucine — open-air cinema screenings from the hallucinecran.* public
 * agenda, one point per town, served as GeoJSON Lines for the
 * `hallucine-seances` layer (createLocalGeoJsonLayer).
 *
 * The agenda carries towns, not coordinates. Coordinates come from a bundled
 * seed (communes-geo.json, geocoded once with geo.api.gouv.fr for France and
 * Nominatim elsewhere) plus a runtime cache filled slowly in the background
 * for towns added since — Nominatim's policy is one request per second.
 */

const SITE_URL = (
  process.env.HALLUCINE_SITE_URL || 'https://hallucinecran.fr'
).replace(/\/$/, '');
const FEED_TTL_MS = 60 * 60 * 1000;
const PAST_DAYS = 365;
const AHEAD_DAYS = 180;
const GEOCODE_PER_REFRESH = 120;
const GEOCODE_SPACING_MS = 1100;
const USER_AGENT = 'hallucine-ciel/1.0 (+https://ciel.hallucinecran.fr)';
const COUNTRY = { FR: 'fr', DE: 'de', IT: 'it', ES: 'es', PT: 'pt', GB: 'gb' };

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

/** Town key shared by the seed, the runtime cache and the grouping. */
export function townKey(seance) {
  return `${seance.pays}|${String(seance.codePostal || '').trim()}|${String(seance.commune || '').trim()}`;
}

function dayMonth(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function clip(text, max = 46) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Group screenings by town and build one GeoJSON point per located town.
 * Pure: `locate(key)` returns [lat, lon] or null.
 * @returns {object[]} GeoJSON Features.
 */
export function buildTownFeatures(seances, locate, now = Date.now()) {
  const towns = new Map();
  for (const s of seances) {
    if (!s?.commune || !s?.pays) continue;
    const key = townKey(s);
    if (!towns.has(key)) towns.set(key, []);
    towns.get(key).push(s);
  }
  const features = [];
  for (const [key, list] of towns) {
    const point = locate(key);
    if (
      !Array.isArray(point) ||
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1])
    )
      continue;
    list.sort((a, b) => String(a.dateDebut).localeCompare(String(b.dateDebut)));
    const upcoming = list.find((s) => new Date(s.dateDebut).getTime() >= now);
    const shown = upcoming || list[list.length - 1];
    const details = [`🎬 ${list.length}`];
    if (shown)
      details.push(
        `${upcoming ? '▶' : '◷'} ${dayMonth(shown.dateDebut)} · ${clip(shown.titre)}`,
      );
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [point[1], point[0]] },
      properties: {
        name: list[0].commune,
        details,
        count: list.length,
        upcoming: Boolean(upcoming),
        url: shown?.urlSource || null,
      },
    });
  }
  return features;
}

export function hallucineSeancesProxy({ sourceRoot = process.cwd() } = {}) {
  const seed = readJson(
    path.join(
      sourceRoot,
      'server',
      'providers',
      'hallucine',
      'communes-geo.json',
    ),
  );
  const cacheFile = path.join(
    sourceRoot,
    '.gev-cache',
    'hallucine-communes.json',
  );
  const learned = readJson(cacheFile);
  let body = null;
  let fetchedAt = 0;
  let inFlight = null;
  let geocoding = false;

  const locate = (key) => seed[key] ?? learned[key] ?? null;

  async function geocodeMissing(keys) {
    if (geocoding || !keys.length) return;
    geocoding = true;
    try {
      for (const key of keys.slice(0, GEOCODE_PER_REFRESH)) {
        const [pays, cp, commune] = key.split('|');
        const q = new URLSearchParams({
          city: commune,
          countrycodes: COUNTRY[pays] || '',
          format: 'json',
          limit: '1',
        });
        if (cp) q.set('postalcode', cp);
        let point = null;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${q}`,
            {
              headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
              signal: AbortSignal.timeout(15000),
            },
          );
          if (res.ok) {
            const hits = await res.json();
            if (hits?.[0]) point = [Number(hits[0].lat), Number(hits[0].lon)];
          }
        } catch {
          // Leave the town for the next refresh.
        }
        learned[key] = point;
        await new Promise((r) => setTimeout(r, GEOCODE_SPACING_MS));
      }
      try {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(learned));
      } catch {
        // A read-only disk only costs the next restart a fresh lookup.
      }
      body = null;
    } finally {
      geocoding = false;
    }
  }

  async function refresh() {
    const now = Date.now();
    const debut = new Date(now - PAST_DAYS * 86400000)
      .toISOString()
      .slice(0, 10);
    const fin = new Date(now + AHEAD_DAYS * 86400000)
      .toISOString()
      .slice(0, 10);
    const input = encodeURIComponent(JSON.stringify({ json: { debut, fin } }));
    const res = await fetch(
      `${SITE_URL}/api/trpc/agenda.plage?input=${input}`,
      {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!res.ok) throw new Error(`agenda HTTP ${res.status}`);
    const payload = await res.json();
    const data = payload?.result?.data;
    const seances = (data?.json ?? data)?.seances;
    if (!Array.isArray(seances)) throw new Error('agenda: unexpected payload');
    const missing = [...new Set(seances.map(townKey))].filter(
      (k) => !(k in seed) && !(k in learned),
    );
    geocodeMissing(missing);
    body = buildTownFeatures(seances, locate, now)
      .map((f) => JSON.stringify(f))
      .join('\n');
    fetchedAt = now;
    return body;
  }

  const install = (server) => {
    server.middlewares.use(
      '/api/hallucine/seances.geojsonl',
      async (req, res) => {
        try {
          if (!body || Date.now() - fetchedAt > FEED_TTL_MS) {
            inFlight ??= refresh().finally(() => {
              inFlight = null;
            });
            try {
              await inFlight;
            } catch (error) {
              if (!body) throw error;
            }
          }
          res.statusCode = 200;
          res.setHeader(
            'Content-Type',
            'application/geo+json-seq; charset=utf-8',
          );
          res.setHeader('Cache-Control', 'public, max-age=900');
          res.end(body);
        } catch (error) {
          console.warn('[Hallucine séances]', error?.message || error);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'agenda unavailable' }));
        }
      },
    );
  };

  return {
    name: 'hallucine-seances',
    configureServer: install,
    configurePreviewServer: install,
  };
}
