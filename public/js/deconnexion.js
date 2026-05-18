async function deconnecter() {
    const msg = document.getElementById('msg');

    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    msg.textContent = 'Vous etes maintenant deconnecte.';
    msg.className = 'msg-ok';

    setTimeout(() => {
        window.location.href = '/';
    }, 800);
}

deconnecter();