#!/bin/sh
set -eu

jwt_directory="/app/config/jwt"
private_key="${jwt_directory}/private.pem"
public_key="${jwt_directory}/public.pem"

mkdir -p "$jwt_directory"

if [ ! -f "$private_key" ] || [ ! -f "$public_key" ]; then
    : "${JWT_PASSPHRASE:?JWT_PASSPHRASE must be set}"
    umask 077
    openssl genrsa -aes256 -passout "pass:${JWT_PASSPHRASE}" -out "$private_key" 4096
    openssl rsa -in "$private_key" -passin "pass:${JWT_PASSPHRASE}" -pubout -out "$public_key"
fi

exec "$@"
