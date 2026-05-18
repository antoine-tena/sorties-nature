// formulaire ajout sortie

const traceEditor = window.TraceMapEditor
    ? window.TraceMapEditor.create({
        mapId: 'carte-trace-ajout',
        latInputId: 'latitude',
        lngInputId: 'longitude',
        fileInputId: 'gpx',
        exportButtonId: 'export-gpx',
        clearButtonId: 'vider-trace',
        infoId: 'trace-info'
    })
    : null;

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

document.getElementById('form-ajout').addEventListener('submit', async function(e) {
    e.preventDefault();
    const msg = document.getElementById('msg');

    const formData = new FormData(this);
    if (traceEditor) {
        traceEditor.appendGeneratedTraceFile(formData, formData.get('titre'));
    }

    // si checkbox non cochee on met 0
    if (!this.querySelector('[name="chien_autorise"]').checked) {
        formData.set('chien_autorise', '0');
    }

    const res = await fetch('/api/sorties', {
        method: 'POST',
        body: formData
    });

    if (res.ok) {
        const data = await res.json();
        msg.textContent = 'Sortie ajoutee !';
        msg.className = 'msg-ok';
        setTimeout(() => {
            window.location.href = 'sortie.html?id=' + data.id;
        }, 800);
    } else {
        const err = await res.json().catch(() => ({ error: 'erreur inconnue' }));
        msg.textContent = 'Erreur : ' + (err.error || 'erreur inconnue');
        msg.className = 'msg-err';
    }
});

chargerTypes();
