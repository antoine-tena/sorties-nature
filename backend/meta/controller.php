<?php

/*
 * Ce fichier regroupe les routes API qui ne rentrent pas dans un CRUD classique.
 * Il sert pour les types, les statistiques SQL, l'export global et l'import JSON.
 * Ca evite de melanger ces actions transverses avec le controleur des sorties.
 * On y trouve donc les petits services annexes du projet.
 */

declare(strict_types=1);

// Cette fonction gere les routes meta comme les types, les stats, l'export et l'import de donnees.
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
