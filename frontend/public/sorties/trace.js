/*
 * Ce fichier fournit l'editeur de trace sur carte reutilise dans l'ajout et la modification.
 * Il sait lire un GPX, dessiner les points dans Leaflet, recentrer la carte
 * et fabriquer un nouveau fichier GPX a partir des clics de l'utilisateur.
 * Toute la logique de trace interactive est concentree ici.
 */

(function () {
    // Cette fonction extrait les points utiles d'un texte GPX pour les reutiliser sur la carte.
    function parseGpxText(text) {
        const xml = new DOMParser().parseFromString(text, 'application/xml');
        return Array.from(xml.querySelectorAll('trkpt, rtept'))
            .map((point) => [
                Number(point.getAttribute('lat')),
                Number(point.getAttribute('lon'))
            ])
            .filter((coords) => Number.isFinite(coords[0]) && Number.isFinite(coords[1]));
    }

    // Cette fonction echappe les caracteres XML avant de generer un fichier GPX propre.
    function escapeXml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    // Cette fonction fabrique un nom de fichier simple a partir du titre de la sortie.
    function slugify(value) {
        return String(value || 'trace-sortie')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'trace-sortie';
    }

    // Cette fonction reconstruit un contenu GPX valide a partir de la liste des points poses.
    function buildGpx(points, name) {
        const trkpts = points.map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}"></trkpt>`).join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sorties Natures" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name || 'Trace sortie')}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
    }

    // Cette fonction cree un editeur complet autour d'une carte Leaflet et des champs du formulaire.
    function createTraceEditor(options) {
        const mapElement = document.getElementById(options.mapId);
        if (!mapElement || typeof L === 'undefined') {
            return {
                appendGeneratedTraceFile() {},
                loadFromUrl: async () => {}
            };
        }

        const latInput = document.getElementById(options.latInputId);
        const lngInput = document.getElementById(options.lngInputId);
        const fileInput = document.getElementById(options.fileInputId);
        const exportButton = document.getElementById(options.exportButtonId);
        const clearButton = document.getElementById(options.clearButtonId);
        const info = document.getElementById(options.infoId);
        const defaultCenter = [46.2276, 2.2137];
        const rawLat = latInput ? latInput.value.trim() : '';
        const rawLng = lngInput ? lngInput.value.trim() : '';
        const initialLat = rawLat !== '' ? Number(rawLat) : NaN;
        const initialLng = rawLng !== '' ? Number(rawLng) : NaN;
        const hasInitialPoint = Number.isFinite(initialLat) && Number.isFinite(initialLng);
        const map = L.map(mapElement).setView(hasInitialPoint ? [initialLat, initialLng] : defaultCenter, hasInitialPoint ? 12 : 6);
        const markers = [];
        let polyline = null;
        let points = [];

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        // Cette fonction met a jour le petit texte d'etat sous la carte selon le nombre de points poses.
        function refreshInfo() {
            if (!info) return;
            if (!points.length) {
                info.textContent = 'Aucun point sur la carte.';
                return;
            }

            info.textContent = `${points.length} point(s) places. Le point de depart correspond au premier point.`;
        }

        // Cette fonction synchronise les champs latitude et longitude avec le premier point du trace.
        function syncStartPoint() {
            if (!points.length) return;
            if (latInput) latInput.value = points[0][0].toFixed(6);
            if (lngInput) lngInput.value = points[0][1].toFixed(6);
        }

        // Cette fonction retire de la carte les marqueurs et la polyline deja dessines.
        function clearDrawnLayers() {
            markers.splice(0).forEach((marker) => marker.remove());
            if (polyline) {
                polyline.remove();
                polyline = null;
            }
        }

        // Cette fonction redessine entierement la carte a partir de l'etat courant des points.
        function render() {
            clearDrawnLayers();

            points.forEach((coords, index) => {
                const marker = L.marker(coords)
                    .addTo(map)
                    .bindPopup(index === 0 ? 'Depart' : `Point ${index + 1}`);
                markers.push(marker);
            });

            if (points.length > 1) {
                polyline = L.polyline(points, {
                    color: '#2d6a4f',
                    weight: 4,
                    opacity: 0.9
                }).addTo(map);
                map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
            } else if (points.length === 1) {
                map.setView(points[0], 13);
            }

            refreshInfo();
        }

        // Cette fonction remplace la liste des points actuelle puis relance l'affichage.
        function setPoints(newPoints) {
            points = newPoints.map(([lat, lng]) => [Number(lat), Number(lng)]);
            if (points.length) {
                syncStartPoint();
            }
            render();
        }

        // Cette fonction charge un GPX distant, l'analyse puis remet ses points dans l'editeur.
        async function loadFromUrl(url) {
            if (!url) return;
            const res = await fetch(url);
            if (!res.ok) return;
            const text = await res.text();
            const loadedPoints = parseGpxText(text);
            if (loadedPoints.length) {
                setPoints(loadedPoints);
            }
        }

        map.on('click', (event) => {
            points.push([
                Number(event.latlng.lat.toFixed(6)),
                Number(event.latlng.lng.toFixed(6))
            ]);
            syncStartPoint();
            render();
        });

        if (fileInput) {
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files && fileInput.files[0];
                if (!file) return;
                const text = await file.text();
                const loadedPoints = parseGpxText(text);
                if (loadedPoints.length) {
                    setPoints(loadedPoints);
                }
            });
        }

        if (exportButton) {
            exportButton.addEventListener('click', () => {
                if (points.length < 2) {
                    refreshInfo();
                    return;
                }

                const titreInput = document.getElementById('titre');
                const title = titreInput ? titreInput.value : 'trace-sortie';
                const gpx = buildGpx(points, title);
                const blob = new Blob([gpx], { type: 'application/gpx+xml' });
                const href = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = href;
                link.download = `${slugify(title)}.gpx`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(href);
            });
        }

        if (clearButton) {
            clearButton.addEventListener('click', () => {
                points = [];
                render();
            });
        }

        refreshInfo();

        return {
            // Cette methode recentre la carte sur un point simple quand aucun GPX n'est encore dessine.
            centerOn(lat, lng) {
                if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
                    map.setView([Number(lat), Number(lng)], 13);
                }
            },
            // Cette methode genere un GPX en memoire et l'ajoute au FormData avant l'envoi du formulaire.
            appendGeneratedTraceFile(formData, title) {
                if (points.length < 2) return;
                syncStartPoint();
                formData.delete('gpx');
                formData.append('gpx', new File([buildGpx(points, title)], `${slugify(title)}.gpx`, {
                    type: 'application/gpx+xml'
                }));
            },
            loadFromUrl
        };
    }

    // Cet objet expose l'editeur de trace et le parseur GPX au reste du frontend.
    window.TraceMapEditor = {
        create: createTraceEditor,
        parseGpxText
    };
})();