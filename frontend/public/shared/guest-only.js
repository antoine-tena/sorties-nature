window.SortiesGuestPage = window.SortiesSession
    ? window.SortiesSession.redirectAuthenticatedHome()
    : Promise.resolve(null);