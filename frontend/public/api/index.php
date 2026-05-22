<?php

/*
 * Ce fichier est l'entree unique de l'API cote web.
 * Apache redirige les appels /api ici, puis ce script charge le backend,
 * lance le routeur principal et renvoie une erreur JSON propre si quelque chose plante.
 * En pratique, c'est la porte d'entree serveur de toute l'application.
 */

declare(strict_types=1);

require dirname(__DIR__, 3) . '/backend/bootstrap.php';

try {
    dispatch_api_request();
} catch (PDOException $e) {
    error_log($e->getMessage());
    app_json_response(['error' => 'erreur serveur'], 500);
} catch (Throwable $e) {
    error_log($e->getMessage());
    app_json_response(['error' => 'erreur serveur'], 500);
}
