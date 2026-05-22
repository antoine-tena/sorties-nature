(function () {
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