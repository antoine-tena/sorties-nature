<?php

declare(strict_types=1);

function dispatch_meta_route(array $segments, string $method): bool
{
    if (($segments[0] ?? '') === 'types' && $method === 'GET') {
        app_json_response(sorties_list_types());
    }

    if (($segments[0] ?? '') === 'stats' && $method === 'GET') {
        app_json_response(sorties_list_stats());
    }

    if (($segments[0] ?? '') === 'export' && $method === 'GET') {
        app_json_response([
            'format' => 'sorties-natures-json-v1',
            'exported_at' => gmdate('c'),
            'sorties' => sorties_export_all(),
        ]);
    }

    if (($segments[0] ?? '') === 'import' && $method === 'POST') {
        $body = app_read_json_body();
        $sorties = is_array($body['sorties'] ?? null) ? $body['sorties'] : $body;
        if (!is_array($sorties)) {
            app_json_response(['error' => 'format invalide: tableau de sorties attendu'], 400);
        }

        app_json_response(['imported' => sorties_import_many($sorties)]);
    }

    return false;
}
