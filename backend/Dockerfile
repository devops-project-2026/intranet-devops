FROM composer:2 AS dependencies

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --no-scripts \
    --optimize-autoloader

FROM php:8.3-cli-alpine

RUN apk add --no-cache openssl postgresql-dev \
    && docker-php-ext-install pdo_pgsql
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=dependencies /app/vendor ./vendor
COPY . .
RUN touch .env
COPY docker/entrypoint.sh /usr/local/bin/backend-entrypoint
RUN chmod +x /usr/local/bin/backend-entrypoint \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000
ENTRYPOINT ["backend-entrypoint"]
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public", "public/index.php"]
