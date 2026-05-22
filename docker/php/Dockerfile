##
# Ce Dockerfile construit l'image PHP/Apache utilisee par le projet.
# Il ajoute juste l'extension PDO MySQL et active rewrite pour les routes API.
# Ensuite il copie la configuration Apache adaptee a l'arborescence du depot.
# Le but est de garder une image simple, suffisante et facile a relancer.
##

FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite

COPY docker/php/000-default.conf /etc/apache2/sites-available/000-default.conf