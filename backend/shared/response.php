<?php

/*
 * Ce fichier sert a renvoyer des reponses JSON de facon uniforme.
 * Le backend l'utilise partout pour fixer le code HTTP, envoyer les donnees
 * et terminer le script sans dupliquer toujours la meme logique.
 * Ca permet d'avoir une sortie propre et consistente dans toute l'API.
 */

declare(strict_types=1);

// Cette fonction envoie une reponse JSON avec le bon statut HTTP puis arrete l'execution.
function app_json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
