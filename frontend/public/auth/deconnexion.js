async function deconnecter() {
    const msg = document.getElementById('msg');

    await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
    }).catch(() => null);

    msg.textContent = 'Vous etes maintenant deconnecte.';
    msg.className = 'msg-ok';

    setTimeout(() => {
        window.location.href = '/auth/connexion.html';
    }, 800);
}

deconnecter();