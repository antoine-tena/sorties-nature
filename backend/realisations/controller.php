<?php

/*
 * Ce fichier gere les routes API des realisations associees aux sorties.
 * Il controle les champs obligatoires, appelle les fonctions SQL adaptees
 * et renvoie des reponses simples pour l'ajout, la mise a jour ou la suppression.
 * C'est la partie HTTP du petit module d'historique des sorties faites.
 */

declare(strict_types=1);

// Cette fonction traite les routes de consultation et de gestion des realisations.
function dispatch_realisation_route(array $segments, string $method): bool
{
    if (($segments[0] ?? '') !== 'realisations') {
        return false;
    }

    if (count($segments) === 2 && $method === 'GET') {
        app_json_response(realisations_list_by_sortie((int) $segments[1]));
    }

    if (count($segments) === 1 && $method === 'POST') {
        $body = app_request_data();
        $sortieId = (int) ($body['id_sortie'] ?? 0);
        $date = (string) ($body['date_realisation'] ?? '');
        if ($sortieId <= 0 || $date === '') {
            app_json_response(['error' => 'id_sortie et date_realisation obligatoires'], 400);
        }

        app_json_response([
            'id' => realisations_create($sortieId, $date, ($body['commentaire'] ?? null) ?: null),
        ], 201);
    }

    if (count($segments) === 2 && $method === 'PUT') {
        $body = app_request_data();
        $date = (string) ($body['date_realisation'] ?? '');
        if ($date === '') {
            app_json_response(['error' => 'date_realisation obligatoire'], 400);
        }

        realisations_update((int) $segments[1], $date, ($body['commentaire'] ?? null) ?: null);
        app_json_response(['ok' => true]);
    }

    if (count($segments) === 2 && $method === 'DELETE') {
        realisations_delete((int) $segments[1]);
        app_json_response(['ok' => true]);
    }

    return false;
}
