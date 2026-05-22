<?php

declare(strict_types=1);

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