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

function afficher(s) {
    const div = document.getElementById('contenu');

    div.innerHTML = `
        <div class="sortie-detail">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                <h1 style="color:#1b4332;">${s.titre}</h1>
                <div style="display:flex; gap:8px;">
                    <button onclick="supprimerSortie(${s.id})" class="btn btn-rouge">Supprimer</button>
                </div>
            </div>

            <div style="margin-bottom:12px;">
                ${s.type_nom ? '<span class="badge">' + s.type_nom + '</span>' : ''}
                ${s.difficulte ? '<span class="badge">' + s.difficulte + '</span>' : ''}
                ${s.chien_autorise ? '<span class="badge">🐕 chien autorisé</span>' : '<span class="badge" style="background:#ffccd5;color:#9d0208;">🐕 chien interdit</span>'}
            </div>

            ${s.description ? '<p style="margin-bottom:15px; color:#444;">' + s.description + '</p>' : ''}

            <div class="stats">
                ${s.distance ? '<div class="stat-bloc">📏 ' + s.distance + ' km</div>' : ''}
                ${s.denivele_positif ? '<div class="stat-bloc">⛰️ +' + s.denivele_positif + ' m</div>' : ''}
                ${s.difficulte ? '<div class="stat-bloc">💪 ' + s.difficulte + '</div>' : ''}
            </div>

            ${s.trace_gpx ? '<p style="margin-top:12px;"><a href="' + s.trace_gpx + '" download class="btn btn-gris">⬇️ Télécharger GPX</a></p>' : ''}
        </div>
    `;
}

async function supprimerSortie(id) {
    if (!confirm('Supprimer cette sortie ?')) return;

    await fetch('/api/sorties/' + id, { method: 'DELETE' });
    window.location.href = '/';
}

charger();
