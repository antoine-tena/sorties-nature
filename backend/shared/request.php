<?php

/*
 * Ce fichier rassemble les petits outils qui lisent les requetes HTTP.
 * Il permet de retrouver la vraie methode, de lire du JSON et de decouper
 * proprement les segments de l'URL pour que le routeur reste simple a lire.
 * Tout ce qui concerne l'entree d'une requete passe ici avant le controleur.
 */

declare(strict_types=1);

// Cette fonction retrouve la methode HTTP reelle en tenant compte des overrides utilises par les formulaires.
function app_request_method(): string
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method === 'POST') {
        if (!empty($_POST['_method'])) {
            return strtoupper((string) $_POST['_method']);
        }

        if (!empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
            return strtoupper((string) $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
        }
    }

    return $method;
}

// Cette fonction lit le corps JSON brut et le convertit en tableau PHP exploitable.
function app_read_json_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        app_json_response(['error' => 'json invalide'], 400);
    }

    return $decoded;
}

// Cette fonction choisit automatiquement entre JSON et POST classique selon le content-type recu.
function app_request_data(): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_starts_with($contentType, 'application/json')) {
        return app_read_json_body();
    }

    return $_POST;
}

// Cette fonction transforme l'URL de l'API en segments simples pour le routeur principal.
function app_api_segments(): array
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/api', PHP_URL_PATH) ?: '/api';
    if (str_starts_with($path, '/api')) {
        $path = substr($path, 4);
    }

    $path = trim($path, '/');
    if ($path === '') {
        return [];
    }

    return array_values(array_filter(explode('/', $path), static fn (string $segment): bool => $segment !== ''));
}
