# Copie Hallucine (ciel.hallucinecran.fr)

Copie de bilawalsidhu/gods-eye-view (MIT) servie en mode production (`vite preview`) sur Railway.

Retouches :
- `GEV_FLIGHTS_SOURCE=adsblol` : avions lus chez adsb.lol (ODbL) au lieu d'OpenSky, dont la licence est non commerciale.
- Câbles sous-marins TeleGeography (CC BY-NC-SA) vidés.
- `Dockerfile.hallucine` : build puis `vite preview`.
- Couche « Open-air cinema » (`hallucine-seances`, jeton `hs`) : séances de l’agenda public de hallucinecran.* (route tRPC `agenda.plage`), un point par commune. Relais `server/providers/hallucine/seances.js` ; coordonnées dans `communes-geo.json` (geo.api.gouv.fr + Nominatim, 1 967/1 974 communes au 20/10/2026), complétées au fil de l’eau dans `.gev-cache/`.

Variables Railway : `GEV_FLIGHTS_SOURCE`, `GEV_ALLOWED_HOSTS`, `GEV_EMBED_FRAME_ANCESTORS`, `PORT`, `RAILWAY_DOCKERFILE_PATH=Dockerfile.hallucine`.
