<?php

declare(strict_types=1);

function dispatch_api_request(): never
{
    $segments = app_api_segments();
    $method = app_request_method();

    if ($segments === []) {
        app_json_response(['ok' => true, 'service' => 'sorties-api-php']);
    }

    if (dispatch_auth_route($segments, $method)) {
        app_json_response(['ok' => true]);
    }

    app_require_user();

    if (dispatch_meta_route($segments, $method)) {
        app_json_response(['ok' => true]);
    }

    if (dispatch_sortie_route($segments, $method)) {
        app_json_response(['ok' => true]);
    }

    if (dispatch_realisation_route($segments, $method)) {
        app_json_response(['ok' => true]);
    }

    app_json_response(['error' => 'route introuvable'], 404);
}