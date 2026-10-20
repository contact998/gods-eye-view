# Copie Hallucine (ciel.hallucinecran.fr)

Copie de bilawalsidhu/gods-eye-view (MIT) servie en mode production (`vite preview`) sur Railway.

Retouches :
- `GEV_FLIGHTS_SOURCE=adsblol` : avions lus chez adsb.lol (ODbL) au lieu d'OpenSky, dont la licence est non commerciale.
- Câbles sous-marins TeleGeography (CC BY-NC-SA) vidés.
- `Dockerfile.hallucine` : build puis `vite preview`.

Variables Railway : `GEV_FLIGHTS_SOURCE`, `GEV_ALLOWED_HOSTS`, `GEV_EMBED_FRAME_ANCESTORS`, `PORT`, `RAILWAY_DOCKERFILE_PATH=Dockerfile.hallucine`.
