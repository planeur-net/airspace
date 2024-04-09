[![fr](https://img.shields.io/badge/lang-fr-blue.svg)](https://github.com/planeur-net/airspace)
[![en](https://img.shields.io/badge/lang-en-red.svg)](README.en.md)
# Airspace
La FFVP met à jour un fichier des espaces aériens au format [OpenAir (Extended)](http://www.winpilot.com/UsersGuide/UserAirspace.asp) et [OpenAir (Standard)](http://www.winpilot.com/UsersGuide/UserAirspace.asp), compatible avec SeeYou et la plupart des GPS utilisés par les vélivoles.  
Ce fichier est compilé bénévolement à partir des publications [AIP](https://www.sia.aviation-civile.gouv.fr/documents/supaip/aip/id/6) du Service de l’Information Aéronautique.

### ZSM
Les [Zones de Sensibilité Majeur](https://www.stac.aviation-civile.gouv.fr/fr/zsm) sont mises a jour régulièrement a partir du fichier KML et de l'outil [Kml2OpenAir](https://github.com/llauner/kml2OpenAir)

### OpenAir Standard / Extended
Le format OpenAir extended n’étant pas encore correctement supporté dans XCsoar ([#1340](https://github.com/XCSoar/XCSoar/issues/1340), [#1349](https://github.com/XCSoar/XCSoar/pull/1349)) ou dans SeeYou Navigator, une version OpenAir Standard est générée automatiquement a partir de la version maintenue au format extended.


# Download
| Fichier | Format | Gen. Auto. | Download | Commentaire |
| --- | --- | --- | --- | --- |
| france.txt | OpenAir | :pencil2: | [https://planeur-net.github.io/airspace/france.txt](https://planeur-net.github.io/airspace/france.txt) | Format OpenAir Standard |
| france_openair_standard.txt | OpenAir | :pencil2: | [france_openair_standard.txt](https://planeur-net.github.io/airspace/france_openair_standard.txt) | |
| france.cub | cub | :heavy_check_mark: | [france.cub](https://planeur-net.github.io/airspace/france.cub) | |
| france.geojson | geojson | :heavy_check_mark: | [france.geojson](https://planeur-net.github.io/airspace/france.geojson) | |
