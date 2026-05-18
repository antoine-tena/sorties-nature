// page modification d'une sortie existante

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const traceEditor = window.TraceMapEditor
    ? window.TraceMapEditor.create({
        mapId: 'carte-trace-modifier',
        latInputId: 'latitude',
        lngInputId: 'longitude',
        fileInputId: 'gpx',
        exportButtonId: 'export-gpx',
        clearButtonId: 'vider-trace',
        infoId: 'trace-info'
    })
    : null;

if (!id) window.location.href = '/';

document.getElementById('btn-annuler').href = 'sortie.html?id=' + id;

async function chargerTypes() {
    const res = await fetch('/api/types');
    const types = await res.json();
    const sel = document.getElementById('id_type_sortie');
    types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.nom;
        sel.appendChild(opt);
    });
}

async function charger() {
    await chargerTypes();

    const res = await fetch('/api/sorties/' + id);
    if (!res.ok) {
        alert('Sortie introuvable');
        window.location.href = '/';
        return;
    }

    const s = await res.json();

    document.getElementById('titre').value = s.titre || '';
    document.getElementById('description').value = s.description || '';
    document.getElementById('difficulte').value = s.difficulte || '';
    document.getElementById('distance').value = s.distance || '';
    document.getElementById('denivele_positif').value = s.denivele_positif || '';
    document.getElementById('latitude').value = s.latitude || '';
    document.getElementById('longitude').value = s.longitude || '';
    document.getElementById('chien_autorise').checked = !!s.chien_autorise;

    // selectionner le bon type
    if (s.id_type_sortie) {
        document.getElementById('id_type_sortie').value = s.id_type_sortie;
    }

    if (traceEditor && s.trace_gpx) {
        await traceEditor.loadFromUrl(s.trace_gpx);
    }
}

document.getElementById('form-modifier').onsubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    formData.set('_method', 'PUT');
    if (traceEditor) {
        traceEditor.appendGeneratedTraceFile(formData, formData.get('titre'));
    }
    if (!document.getElementById('chien_autorise').checked) {
        formData.set('chien_autorise', '0');
    }

    const res = await fetch('/api/sorties/' + id, {
        method: 'POST',
        body: formData
    });

    const msg = document.getElementById('msg');
    if (res.ok) {
        msg.className = 'msg-ok';
        msg.textContent = 'Sortie modifiée !';
        setTimeout(() => window.location.href = 'sortie.html?id=' + id, 800);
    } else {
        const err = await res.json();
        msg.className = 'msg-err';
        msg.textContent = 'Erreur : ' + (err.error || 'inconnue');
    }
};

charger();
