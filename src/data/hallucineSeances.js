import { createLocalGeoJsonLayer } from './localGeojsonCore.js';

/**
 * Hallucine open-air cinema screenings: one point per town, served by the
 * hallucine-seances server provider from the hallucinecran.* public agenda.
 * @param {object} services Caller-owned context, overlay and render operations.
 * @returns {object} The screenings layer.
 */
export function createHallucineSeancesLayer(services) {
  return createLocalGeoJsonLayer(
    {
      id: 'hallucine-seances',
      url: '/api/hallucine/seances.geojsonl',
      name: 'Open-air cinema',
      color: '#f5b83d',
      icon: '✦',
      source: 'Hallucine',
      labels: true,
      labelMax: 600,
      labelGridPx: 120,
    },
    services,
  );
}
