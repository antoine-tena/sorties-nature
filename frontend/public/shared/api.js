/*
 * Ce fichier contient un petit wrapper autour de fetch pour toute l'application.
 * Il ajoute automatiquement les cookies de session sur les requetes et gere
 * le cas ou l'API repond 401 en renvoyant l'utilisateur vers la connexion.
 * Comme ca, les autres scripts restent plus courts et plus uniformes.
 */

(function () {
    // Cette fonction envoie une requete API standard et redirige vers la connexion si la session a expire.
    async function apiFetch(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            ...options
        });

        if (response.status === 401) {
            if (window.SortiesSession) {
                window.SortiesSession.redirectToLogin();
            } else {
                window.location.replace('/auth/connexion.html');
            }

            throw new Error('authentification requise');
        }

        return response;
    }

    window.apiFetch = apiFetch;
})();