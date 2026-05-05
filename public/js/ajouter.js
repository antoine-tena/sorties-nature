// formulaire ajout sortie

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
        msg.textContent = 'Erreur...';
        msg.className = 'msg-err';
    }
});

chargerTypes();
