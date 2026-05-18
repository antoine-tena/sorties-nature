<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/php/bootstrap.php';

try {
    $segments = apiSegments();
    $method = requestMethod();
    $pdo = db();

    if ($segments === []) {
        jsonResponse(['ok' => true, 'service' => 'sorties-api-php']);
    }

    if ($segments[0] === 'auth') {
        $action = $segments[1] ?? '';

        if ($method === 'GET' && $action === 'session') {
            jsonResponse(['user' => currentUser()]);
        }

        if ($method === 'POST' && $action === 'register') {
            $body = requestData();
            $nom = trim((string) ($body['nom'] ?? ''));
            $email = strtolower(trim((string) ($body['email'] ?? '')));
            $password = (string) ($body['password'] ?? '');

            if ($nom === '' || $email === '' || $password === '') {
                jsonResponse(['error' => 'nom, email et mot de passe obligatoires'], 400);
            }

            if (strlen($password) < 4) {
                jsonResponse(['error' => 'mot de passe trop court'], 400);
            }

            $stmt = $pdo->prepare('SELECT id FROM utilisateurs WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                jsonResponse(['error' => 'email deja utilise'], 409);
            }

            $insert = $pdo->prepare('INSERT INTO utilisateurs (nom, email, mot_de_passe_hash) VALUES (?, ?, ?)');
            $insert->execute([$nom, $email, hashPassword($password)]);

            $_SESSION['user'] = [
                'id' => (int) $pdo->lastInsertId(),
                'nom' => $nom,
                'email' => $email,
            ];

            jsonResponse(['user' => currentUser()], 201);
        }

        if ($method === 'POST' && $action === 'login') {
            $body = requestData();
            $email = strtolower(trim((string) ($body['email'] ?? '')));
            $password = (string) ($body['password'] ?? '');

            if ($email === '' || $password === '') {
                jsonResponse(['error' => 'email et mot de passe obligatoires'], 400);
            }

            $stmt = $pdo->prepare('SELECT id, nom, email, mot_de_passe_hash FROM utilisateurs WHERE email = ?');
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || $user['mot_de_passe_hash'] !== hashPassword($password)) {
                jsonResponse(['error' => 'identifiants invalides'], 401);
            }

            $_SESSION['user'] = exposeUser($user);
            jsonResponse(['user' => currentUser()]);
        }

        if ($method === 'POST' && $action === 'logout') {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 3600, $params['path'], $params['domain'] ?? '', (bool) $params['secure'], (bool) $params['httponly']);
            }
            session_destroy();
            jsonResponse(['ok' => true]);
        }
    }

    if ($segments[0] === 'sorties' && count($segments) === 1 && $method === 'GET') {
        $rows = $pdo->query(
            'SELECT s.*, t.nom AS type_nom
             FROM sorties s
             LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
             ORDER BY s.id DESC'
        )->fetchAll();
        jsonResponse($rows);
    }

    if ($segments[0] === 'export' && $method === 'GET') {
        $sorties = $pdo->query(
            'SELECT s.*, t.nom AS type_nom
             FROM sorties s
             LEFT JOIN types_sortie t ON s.id_type_sortie = t.id
             ORDER BY s.id'
        )->fetchAll();
        $realisations = $pdo->query('SELECT * FROM realisations ORDER BY id_sortie, date_realisation DESC')->fetchAll();

        $grouped = [];
        foreach ($realisations as $realisation) {
            $grouped[$realisation['id_sortie']][] = $realisation;
        }

        $payload = array_map(static function (array $sortie) use ($grouped): array {
            $sortie['realisations'] = $grouped[$sortie['id']] ?? [];
            return $sortie;
        }, $sorties);

        jsonResponse([
            'format' => 'sorties-natures-json-v1',
            'exported_at' => gmdate('c'),
            'sorties' => $payload,
        ]);
    }

    if ($segments[0] === 'import' && $method === 'POST') {
        $body = readJsonBody();
        $sorties = is_array($body) ? $body : ($body['sorties'] ?? null);
        if (!is_array($sorties)) {
            jsonResponse(['error' => 'format invalide: tableau de sorties attendu'], 400);
        }

        $pdo->beginTransaction();
        try {
            $insertSortie = $pdo->prepare(
                'INSERT INTO sorties
                    (titre, description, id_type_sortie, difficulte, distance, denivele_positif,
                     chien_autorise, is_public, trace_gpx, latitude, longitude)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $insertRealisation = $pdo->prepare(
                'INSERT INTO realisations (id_sortie, date_realisation, commentaire)
                 VALUES (?, ?, ?)'
            );

            $imported = 0;
            foreach ($sorties as $item) {
                if (!is_array($item) || empty($item['titre'])) {
                    continue;
                }

                $payload = sortiePayload($item, null, $item['trace_gpx'] ?? null);
                $payload['id_type_sortie'] = resolveTypeId($pdo, $item);

                $insertSortie->execute([
                    $payload['titre'],
                    $payload['description'],
                    $payload['id_type_sortie'],
                    $payload['difficulte'],
                    $payload['distance'],
                    $payload['denivele_positif'],
                    $payload['chien_autorise'],
                    $payload['is_public'],
                    $payload['trace_gpx'],
                    $payload['latitude'],
                    $payload['longitude'],
                ]);

                $sortieId = (int) $pdo->lastInsertId();
                foreach (($item['realisations'] ?? []) as $realisation) {
                    if (!is_array($realisation) || empty($realisation['date_realisation'])) {
                        continue;
                    }

                    $insertRealisation->execute([
                        $sortieId,
                        $realisation['date_realisation'],
                        $realisation['commentaire'] ?? null,
                    ]);
                }

                $imported++;
            }

            $pdo->commit();
            jsonResponse(['imported' => $imported]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    if ($segments[0] === 'sorties' && count($segments) === 1 && $method === 'POST') {
        $payload = sortiePayload($_POST, $_FILES['gpx'] ?? null);
        if ($payload['titre'] === '') {
            jsonResponse(['error' => 'titre obligatoire'], 400);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO sorties
                (titre, description, id_type_sortie, difficulte, distance, denivele_positif,
                 chien_autorise, is_public, trace_gpx, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $payload['titre'],
            $payload['description'],
            $payload['id_type_sortie'],
            $payload['difficulte'],
            $payload['distance'],
            $payload['denivele_positif'],
            $payload['chien_autorise'],
            $payload['is_public'],
            $payload['trace_gpx'],
            $payload['latitude'],
            $payload['longitude'],
        ]);

        jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
    }

    if ($segments[0] === 'sorties' && count($segments) === 2) {
        $id = (int) $segments[1];

        if ($method === 'GET') {
            $sortie = getSortieById($id);
            if (!$sortie) {
                jsonResponse(['error' => 'sortie introuvable'], 404);
            }
            jsonResponse($sortie);
        }

        if ($method === 'PUT') {
            $existing = getSortieById($id);
            if (!$existing) {
                jsonResponse(['error' => 'sortie introuvable'], 404);
            }

            $payload = sortiePayload($_POST + $existing, $_FILES['gpx'] ?? null, $existing['trace_gpx'] ?? null);
            if ($payload['titre'] === '') {
                jsonResponse(['error' => 'titre obligatoire'], 400);
            }

            $stmt = $pdo->prepare(
                'UPDATE sorties
                 SET titre = ?, description = ?, id_type_sortie = ?, difficulte = ?, distance = ?,
                     denivele_positif = ?, chien_autorise = ?, is_public = ?, trace_gpx = ?,
                     latitude = ?, longitude = ?
                 WHERE id = ?'
            );
            $stmt->execute([
                $payload['titre'],
                $payload['description'],
                $payload['id_type_sortie'],
                $payload['difficulte'],
                $payload['distance'],
                $payload['denivele_positif'],
                $payload['chien_autorise'],
                $payload['is_public'],
                $payload['trace_gpx'],
                $payload['latitude'],
                $payload['longitude'],
                $id,
            ]);

            jsonResponse(['ok' => true]);
        }

        if ($method === 'DELETE') {
            $stmt = $pdo->prepare('DELETE FROM sorties WHERE id = ?');
            $stmt->execute([$id]);
            jsonResponse(['ok' => true]);
        }
    }

    if ($segments[0] === 'types' && $method === 'GET') {
        $rows = $pdo->query('SELECT * FROM types_sortie ORDER BY nom')->fetchAll();
        jsonResponse($rows);
    }

    if ($segments[0] === 'stats' && $method === 'GET') {
        $rows = $pdo->query('SELECT label, valeur FROM stats_eco ORDER BY label')->fetchAll();
        jsonResponse($rows);
    }

    if ($segments[0] === 'realisations' && count($segments) === 2 && $method === 'GET') {
        $stmt = $pdo->prepare('SELECT * FROM realisations WHERE id_sortie = ? ORDER BY date_realisation DESC');
        $stmt->execute([(int) $segments[1]]);
        jsonResponse($stmt->fetchAll());
    }

    if ($segments[0] === 'realisations' && count($segments) === 1 && $method === 'POST') {
        $body = requestData();
        $idSortie = (int) ($body['id_sortie'] ?? 0);
        $date = (string) ($body['date_realisation'] ?? '');
        if ($idSortie <= 0 || $date === '') {
            jsonResponse(['error' => 'id_sortie et date_realisation obligatoires'], 400);
        }

        $stmt = $pdo->prepare('INSERT INTO realisations (id_sortie, date_realisation, commentaire) VALUES (?, ?, ?)');
        $stmt->execute([$idSortie, $date, ($body['commentaire'] ?? null) ?: null]);
        jsonResponse(['id' => (int) $pdo->lastInsertId()], 201);
    }

    if ($segments[0] === 'realisations' && count($segments) === 2 && $method === 'PUT') {
        $body = requestData();
        $date = (string) ($body['date_realisation'] ?? '');
        if ($date === '') {
            jsonResponse(['error' => 'date_realisation obligatoire'], 400);
        }

        $stmt = $pdo->prepare('UPDATE realisations SET date_realisation = ?, commentaire = ? WHERE id = ?');
        $stmt->execute([$date, ($body['commentaire'] ?? null) ?: null, (int) $segments[1]]);
        jsonResponse(['ok' => true]);
    }

    if ($segments[0] === 'realisations' && count($segments) === 2 && $method === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM realisations WHERE id = ?');
        $stmt->execute([(int) $segments[1]]);
        jsonResponse(['ok' => true]);
    }

    jsonResponse(['error' => 'route introuvable'], 404);
} catch (PDOException $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'erreur serveur'], 500);
} catch (Throwable $e) {
    error_log($e->getMessage());
    jsonResponse(['error' => 'erreur serveur'], 500);
}