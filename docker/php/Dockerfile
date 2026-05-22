FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite

COPY docker/php/000-default.conf /etc/apache2/sites-available/000-default.conf