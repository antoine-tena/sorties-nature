window.SortiesProtectedPage = window.SortiesSession
    ? window.SortiesSession.requireAuthenticatedSession()
    : Promise.resolve(null);