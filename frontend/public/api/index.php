<?php

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
