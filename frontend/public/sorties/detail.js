const escapeHtml = window.SortiesHtml
    ? window.SortiesHtml.escape
    : (value) => String(value ?? '');

const paramsSortie = new URLSearchParams(window.location.search);
const idSortiePage = paramsSortie.get('id');

if (!idSortiePage) window.location.href = '/';

async function chargerSortiePage() {
    const res = await window.apiFetch('/api/sorties/' + idSortiePage);

    if (!res.ok) {
        document.getElementById('contenu').innerHTML = '<p>Sortie introuvable.</p>';
        return;
    }

    const sortie = await res.json();
    afficherSortie(sortie);
}

function texteOuVide(value) {
    return value === null || value === undefined ? '' : value;
}

function afficherSortie(sortie) {
    const div = document.getElementById('contenu');
    const sortieId = Number(sortie.id) || 0;
    const description = sortie.description ? `<p style="margin-bottom:15px; color:#444;">${escapeHtml(sortie.description)}</p>` : '';
    const typeNom = sortie.type_nom ? `<span class="badge">${escapeHtml(sortie.type_nom)}</span>` : '';
    const difficulte = sortie.difficulte ? `<span class="badge">${escapeHtml(sortie.difficulte)}</span>` : '';
    const traceButton = sortie.trace_gpx ? `<p style="margin-top:12px;"><a href="${sortie.trace_gpx}" download class="btn btn-gris">Telecharger GPX</a></p>` : '';

    div.innerHTML = `
        <div class="sortie-detail">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:15px;">
                <h1 style="color:#1b4332;">${escapeHtml(sortie.titre)}</h1>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="btn-exporter-sortie" class="btn btn-gris">Exporter JSON</button>
                    <a href="/sorties/modifier.html?id=${sortieId}" class="btn btn-gris">Modifier</a>
                    <button id="btn-supprimer-sortie" class="btn btn-rouge">Supprimer</button>
                </div>
            </div>

            <div style="margin-bottom:12px;">
                ${typeNom}
                ${difficulte}
                ${sortie.chien_autorise ? '<span class="badge">chien autorise</span>' : '<span class="badge" style="background:#ffccd5;color:#9d0208;">chien interdit</span>'}
            </div>

            ${description}

            <div class="stats">
                ${sortie.distance ? '<div class="stat-bloc">' + sortie.distance + ' km</div>' : ''}
                ${sortie.denivele_positif ? '<div class="stat-bloc">+' + sortie.denivele_positif + ' m</div>' : ''}
                ${sortie.difficulte ? '<div class="stat-bloc">' + escapeHtml(sortie.difficulte) + '</div>' : ''}
                ${sortie.latitude && sortie.longitude ? '<div class="stat-bloc">' + sortie.latitude + ', ' + sortie.longitude + '</div>' : ''}
            </div>

            ${traceButton}

            <div id="carte-sortie" class="carte-sortie" aria-label="Carte de la sortie"></div>

            <hr style="margin:20px 0; border:0; border-top:1px solid #eee;">

            <h3>Historique des realisations</h3>
            <form id="form-realisation" style="margin-top:10px; max-width:100%;">
                <input type="date" id="date_r" required>
                <textarea id="comm_r" placeholder="Commentaire sur cette realisation..."></textarea>
                <button type="submit" class="btn btn-vert">Ajouter cette date</button>
            </form>
            <div id="liste-realisations" style="margin-top:15px;"></div>
        </div>
    `;

    window.sortieCourante = sortie;
    chargerRealisations(sortie.id);

    document.getElementById('btn-exporter-sortie').addEventListener('click', exporterJSON);
    document.getElementById('btn-supprimer-sortie').addEventListener('click', () => supprimerSortie(sortieId));

    setTimeout(() => {
        initCarte(sortie);
    }, 0);

    document.getElementById('form-realisation').onsubmit = async (e) => {
        e.preventDefault();
        const body = {
            id_sortie: sortie.id,
            date_realisation: document.getElementById('date_r').value,
            commentaire: document.getElementById('comm_r').value
        };

        await window.apiFetch('/api/realisations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        document.getElementById('date_r').value = '';
        document.getElementById('comm_r').value = '';
        chargerRealisations(sortie.id);
    };
}

async function supprimerSortie(idSortie) {
    if (!confirm('Supprimer cette sortie ?')) return;

    await window.apiFetch('/api/sorties/' + idSortie, { method: 'DELETE' });
    window.location.href = '/';
}

function exporterJSON() {
    const sortie = window.sortieCourante;
    if (!sortie) return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sortie, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', sortie.titre + '.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

async function chargerRealisations(idSortie) {
    const res = await window.apiFetch(`/api/realisations/${idSortie}`);
    const data = await res.json();
    const listDiv = document.getElementById('liste-realisations');

    if (data.length === 0) {
        listDiv.innerHTML = '<p>Aucune realisation pour cette sortie.</p>';
        return;
    }

    listDiv.innerHTML = data.map((realisation) => `
        <div style="font-size:0.9rem; padding:8px; border-left:3px solid #2d6a4f; background:#f9f9f9; margin-bottom:5px;">
            <strong>${new Date(realisation.date_realisation).toLocaleDateString()}</strong>:
            ${escapeHtml(texteOuVide(realisation.commentaire) || 'Pas de commentaire')}
        </div>
    `).join('');
}

function initCarte(sortie) {
    const container = document.getElementById('carte-sortie');
    if (!container || typeof L === 'undefined') return;

    if (window.carteSortie) {
        window.carteSortie.remove();
        window.carteSortie = null;
    }

    const hasCoords = sortie.latitude && sortie.longitude;
    const defaultCenter = [46.2276, 2.2137];
    const center = hasCoords ? [sortie.latitude, sortie.longitude] : defaultCenter;
    const zoom = hasCoords ? 13 : 6;

    const carte = L.map(container).setView(center, zoom);
    window.carteSortie = carte;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(carte);

    let marker = null;
    if (hasCoords) {
        marker = L.marker(center)
            .addTo(carte)
            .bindPopup('Point de depart');
    }

    if (sortie.trace_gpx) {
        chargerTraceGpx(carte, sortie.trace_gpx, marker);
    }
}

async function chargerTraceGpx(carte, url, marker) {
    try {
        const res = await fetch(url);
        if (!res.ok) return;
        const text = await res.text();
        const xml = new DOMParser().parseFromString(text, 'application/xml');
        const points = Array.from(xml.querySelectorAll('trkpt, rtept'))
            .map((pt) => [
                Number(pt.getAttribute('lat')),
                Number(pt.getAttribute('lon'))
            ])
            .filter((coords) => Number.isFinite(coords[0]) && Number.isFinite(coords[1]));

        if (!points.length) return;

        const trace = L.polyline(points, {
            color: '#2d6a4f',
            weight: 4,
            opacity: 0.9
        }).addTo(carte);

        carte.fitBounds(trace.getBounds(), { padding: [20, 20] });

        if (marker) {
            marker.remove();
        }

        L.marker(points[0]).addTo(carte).bindPopup('Debut trace');
    } catch (err) {
        console.warn('Impossible de charger le GPX', err);
    }
}

(async function initPage() {
    const session = await (window.SortiesProtectedPage || Promise.resolve({ user: true }));
    if (!session || !session.user) return;
    await chargerSortiePage();
})();