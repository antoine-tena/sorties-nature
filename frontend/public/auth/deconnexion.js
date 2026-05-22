/*
 * Ce fichier s'occupe de la deconnexion des qu'on arrive sur la page dediee.
 * Il appelle l'API pour fermer la session, affiche un message de confirmation,
 * puis renvoie l'utilisateur vers l'ecran de connexion apres un court delai.
 * Le comportement est volontairement tres simple.
 */

// Cette fonction demande la fermeture de session puis redirige vers la connexion.
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

// Cet appel lance directement la deconnexion quand la page est ouverte.
deconnecter();