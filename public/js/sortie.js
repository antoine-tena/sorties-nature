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

    const s = await res.json();
    afficher(s);
}

async function supprimerSortie(id) {
    if (!confirm('Supprimer cette sortie ?')) return;

    await fetch('/api/sorties/' + id, { method: 'DELETE' });
    window.location.href = '/';
}

charger();

// Fonction pour l'Export JSON (Point 3)
function exporterJSON(sortie) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sortie));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", sortie.titre + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function afficher(s) {
    const div = document.getElementById('contenu');
    div.innerHTML = `
        <div class="sortie-detail">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:15px;">
                <h1 style="color:#1b4332;">${s.titre}</h1>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button onclick="supprimerSortie(${s.id})" class="btn btn-rouge">Supprimer</button>
                    <button onclick='window.exporterSortie()' class="btn btn-gris">Exporter JSON</button>
                </div>
            </div>

            <div style="margin-bottom:12px;">
                ${s.type_nom ? '<span class="badge">' + s.type_nom + '</span>' : ''}
                ${s.difficulte ? '<span class="badge">' + s.difficulte + '</span>' : ''}
                ${s.chien_autorise ? '<span class="badge"> chien autorisé</span>' : '<span class="badge" style="background:#ffccd5;color:#9d0208;">🐕 chien interdit</span>'}
            </div>

            ${s.description ? '<p style="margin-bottom:15px; color:#444;">' + s.description + '</p>' : ''}

            <div class="stats">
                ${s.distance ? '<div class="stat-bloc"> ' + s.distance + ' km</div>' : ''}
                ${s.denivele_positif ? '<div class="stat-bloc"> +' + s.denivele_positif + ' m</div>' : ''}
                ${s.difficulte ? '<div class="stat-bloc"> ' + s.difficulte + '</div>' : ''}
            </div>

            ${s.trace_gpx ? '<p style="margin-top:12px;"><a href="' + s.trace_gpx + '" download class="btn btn-gris">⬇️ Télécharger GPX</a></p>' : ''}

            <hr>

            <h3>Historique des réalisations</h3>
            <form id="form-realisation" style="margin-top:10px; max-width:100%;">
                <input type="date" id="date_r" required>
                <textarea id="comm_r" placeholder="Commentaire sur cette fois-ci..."></textarea>
                <button type="submit" class="btn btn-vert">Ajouter cette date</button>
            </form>
            <div id="liste-realisations" style="margin-top:15px;"></div>
        </div>
    `;

    // Attacher l'événement pour le JSON
    window.exporterSortie = () => exporterJSON(s);

    // Charger les réalisations existantes
    chargerRealisations(s.id);

    // Gérer l'ajout d'une réalisation
    document.getElementById('form-realisation').onsubmit = async (e) => {
        e.preventDefault();
        const body = {
            id_sortie: s.id,
            date_realisation: document.getElementById('date_r').value,
            commentaire: document.getElementById('comm_r').value
        };
        await fetch('/api/realisations', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });
        chargerRealisations(s.id);
    };
}

async function chargerRealisations(idSortie) {
    const res = await fetch(`/api/realisations/${idSortie}`);
    const data = await res.json();
    const listDiv = document.getElementById('liste-realisations');
    listDiv.innerHTML = data.map(r => `
        <div style="font-size:0.9rem; padding:8px; border-left:3px solid #2d6a4f; background:#f9f9f9; margin-bottom:5px;">
            <strong>${new Date(r.date_realisation).toLocaleDateString()}</strong>: ${r.commentaire || 'Pas de commentaire'}
        </div>
    `).join('');
}
