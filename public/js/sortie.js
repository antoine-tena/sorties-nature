// page detail d'une sortie

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

if (!id) window.location.href = '/';

async function charger() {
    const res = await fetch('/api/sorties/' + id);

    if (!res.ok) {
        document.getElementById('contenu').innerHTML = '<p>Sortie introuvable.</p>';
        return;
    }

    const sortie = await res.json();
    afficher(sortie);
}

function texteOuVide(value) {
    return value === null || value === undefined ? '' : value;
}

function afficher(sortie) {
    const div = document.getElementById('contenu');

    div.innerHTML = `
        <div class="sortie-detail">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:15px;">
                <h1 style="color:#1b4332;">${sortie.titre}</h1>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button onclick="exporterJSON()" class="btn btn-gris">Exporter JSON</button>
                    <button onclick="supprimerSortie(${sortie.id})" class="btn btn-rouge">Supprimer</button>
                </div>
            </div>

            <div style="margin-bottom:12px;">
                ${sortie.type_nom ? '<span class="badge">' + sortie.type_nom + '</span>' : ''}
                ${sortie.difficulte ? '<span class="badge">' + sortie.difficulte + '</span>' : ''}
                ${sortie.chien_autorise ? '<span class="badge">chien autorise</span>' : '<span class="badge" style="background:#ffccd5;color:#9d0208;">chien interdit</span>'}
            </div>

            ${sortie.description ? '<p style="margin-bottom:15px; color:#444;">' + sortie.description + '</p>' : ''}

            <div class="stats">
                ${sortie.distance ? '<div class="stat-bloc">' + sortie.distance + ' km</div>' : ''}
                ${sortie.denivele_positif ? '<div class="stat-bloc">+' + sortie.denivele_positif + ' m</div>' : ''}
                ${sortie.difficulte ? '<div class="stat-bloc">' + sortie.difficulte + '</div>' : ''}
                ${sortie.latitude && sortie.longitude ? '<div class="stat-bloc">' + sortie.latitude + ', ' + sortie.longitude + '</div>' : ''}
            </div>

            ${sortie.trace_gpx ? '<p style="margin-top:12px;"><a href="' + sortie.trace_gpx + '" download class="btn btn-gris">Telecharger GPX</a></p>' : ''}

            ${sortie.latitude && sortie.longitude ? '<div id="carte-depart" style="height:250px; margin-top:15px; border-radius:6px;"></div>' : ''}

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

    // carte leaflet si coordonnees disponibles
    if (sortie.latitude && sortie.longitude) {
        setTimeout(() => {
            const carte = L.map('carte-depart').setView([sortie.latitude, sortie.longitude], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(carte);
            L.marker([sortie.latitude, sortie.longitude])
                .addTo(carte)
                .bindPopup('Point de départ')
                .openPopup();
        }, 0);
    }

    document.getElementById('form-realisation').onsubmit = async (e) => {
        e.preventDefault();
        const body = {
            id_sortie: sortie.id,
            date_realisation: document.getElementById('date_r').value,
            commentaire: document.getElementById('comm_r').value
        };

        await fetch('/api/realisations', {
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

    await fetch('/api/sorties/' + idSortie, { method: 'DELETE' });
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
    const res = await fetch(`/api/realisations/${idSortie}`);
    const data = await res.json();
    const listDiv = document.getElementById('liste-realisations');

    if (data.length === 0) {
        listDiv.innerHTML = '<p>Aucune realisation pour cette sortie.</p>';
        return;
    }

    listDiv.innerHTML = data.map((realisation) => `
        <div style="font-size:0.9rem; padding:8px; border-left:3px solid #2d6a4f; background:#f9f9f9; margin-bottom:5px;">
            <strong>${new Date(realisation.date_realisation).toLocaleDateString()}</strong>:
            ${texteOuVide(realisation.commentaire) || 'Pas de commentaire'}
        </div>
    `).join('');
}

charger();
