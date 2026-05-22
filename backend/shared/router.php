<?php

/*
 * Ce fichier joue le role de routeur principal pour l'API.
 * Il recupere la methode et l'URL, laisse passer les routes d'authentification,
 * exige une session pour le reste, puis delegue aux modules metier adaptes.
 * C'est donc lui qui decide quelle partie du backend doit repondre.
 */

declare(strict_types=1);

// Cette fonction route chaque requete API vers le bon controleur puis renvoie une erreur si rien ne correspond.
function dispatch_api_request(): never
{
    $segments = app_api_segments();
    $method = app_request_method();

    if ($segments === []) {
        app_json_response(['ok' => true, 'service' => 'sorties-api-php']);
    }

    dispatch_auth_route($segments, $method);

    app_require_user();

    dispatch_meta_route($segments, $method);
    dispatch_sortie_route($segments, $method);
    dispatch_realisation_route($segments, $method);

    app_json_response(['error' => 'route introuvable'], 404);
}