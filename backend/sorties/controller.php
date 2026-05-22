<?php

/*
 * Ce fichier gere les routes API qui concernent les sorties.
 * Il prend les donnees des formulaires, appelle la couche repository,
 * verifie les cas obligatoires comme le titre et renvoie la bonne reponse JSON.
 * Toute la logique HTTP du CRUD des sorties passe ici.
 */

declare(strict_types=1);

// Cette fonction traite les routes de liste, detail, creation, modification et suppression des sorties.
function dispatch_sortie_route(array $segments, string $method): bool
{
    if (($segments[0] ?? '') !== 'sorties') {
        return false;
    }

    if (count($segments) === 1 && $method === 'GET') {
        app_json_response(sorties_list_all());
    }

    if (count($segments) === 1 && $method === 'POST') {
        $payload = app_build_sortie_payload($_POST, $_FILES['gpx'] ?? null);
        if ($payload['titre'] === '') {
            app_json_response(['error' => 'titre obligatoire'], 400);
        }

        app_json_response(['id' => sorties_create($payload)], 201);
    }

    if (count($segments) !== 2) {
        return false;
    }

    $id = (int) $segments[1];
    $sortie = sorties_find_by_id($id);
    if (!$sortie) {
        app_json_response(['error' => 'sortie introuvable'], 404);
    }

    if ($method === 'GET') {
        app_json_response($sortie);
    }

    if ($method === 'PUT') {
        $payload = app_build_sortie_payload($_POST + $sortie, $_FILES['gpx'] ?? null, $sortie['trace_gpx'] ?? null);
        if ($payload['titre'] === '') {
            app_json_response(['error' => 'titre obligatoire'], 400);
        }

        sorties_update($id, $payload);
        app_json_response(['ok' => true]);
    }

    if ($method === 'DELETE') {
        sorties_delete($id);
        app_json_response(['ok' => true]);
    }

    return false;
}
