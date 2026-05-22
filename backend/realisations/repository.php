<?php

/*
 * Ce fichier rassemble les requetes SQL sur l'historique des realisations.
 * Il permet de lister les dates deja ajoutees pour une sortie et de gerer
 * leur creation, leur modification ou leur suppression sans surcharger le controleur.
 * C'est une petite couche d'acces aux donnees dediee a ce module.
 */

declare(strict_types=1);

// Cette fonction retourne les realisations d'une sortie en les triant des plus recentes aux plus anciennes.
function realisations_list_by_sortie(int $sortieId): array
{
    $stmt = app_db()->prepare('SELECT * FROM realisations WHERE id_sortie = ? ORDER BY date_realisation DESC');
    $stmt->execute([$sortieId]);
    return $stmt->fetchAll();
}

// Cette fonction ajoute une nouvelle realisation a l'historique d'une sortie.
function realisations_create(int $sortieId, string $date, ?string $commentaire): int
{
    $stmt = app_db()->prepare('INSERT INTO realisations (id_sortie, date_realisation, commentaire) VALUES (?, ?, ?)');
    $stmt->execute([$sortieId, $date, $commentaire]);
    return (int) app_db()->lastInsertId();
}

// Cette fonction met a jour la date et le commentaire d'une realisation existante.
function realisations_update(int $id, string $date, ?string $commentaire): void
{
    $stmt = app_db()->prepare('UPDATE realisations SET date_realisation = ?, commentaire = ? WHERE id = ?');
    $stmt->execute([$date, $commentaire, $id]);
}

// Cette fonction supprime une realisation a partir de son identifiant.
function realisations_delete(int $id): void
{
    $stmt = app_db()->prepare('DELETE FROM realisations WHERE id = ?');
    $stmt->execute([$id]);
}
