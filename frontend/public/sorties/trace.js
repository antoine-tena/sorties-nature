(function () {
    function parseGpxText(text) {
        const xml = new DOMParser().parseFromString(text, 'application/xml');
        return Array.from(xml.querySelectorAll('trkpt, rtept'))
            .map((point) => [
                Number(point.getAttribute('lat')),
                Number(point.getAttribute('lon'))
            ])
            .filter((coords) => Number.isFinite(coords[0]) && Number.isFinite(coords[1]));
    }

    function escapeXml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function slugify(value) {
        return String(value || 'trace-sortie')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'trace-sortie';
    }

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

        function refreshInfo() {
            if (!info) return;
            if (!points.length) {
                info.textContent = 'Aucun point sur la carte.';
                return;
            }

            info.textContent = `${points.length} point(s) places. Le point de depart correspond au premier point.`;
        }

        function syncStartPoint() {
            if (!points.length) return;
            if (latInput) latInput.value = points[0][0].toFixed(6);
            if (lngInput) lngInput.value = points[0][1].toFixed(6);
        }

        function clearDrawnLayers() {
            markers.splice(0).forEach((marker) => marker.remove());
            if (polyline) {
                polyline.remove();
                polyline = null;
            }
        }

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

        function setPoints(newPoints) {
            points = newPoints.map(([lat, lng]) => [Number(lat), Number(lng)]);
            if (points.length) {
                syncStartPoint();
            }
            render();
        }

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
            centerOn(lat, lng) {
                if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
                    map.setView([Number(lat), Number(lng)], 13);
                }
            },
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

    window.TraceMapEditor = {
        create: createTraceEditor,
        parseGpxText
    };
})();