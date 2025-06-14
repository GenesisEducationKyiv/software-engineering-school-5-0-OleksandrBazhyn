#!/bin/sh
npx knex --knexfile ./knexfile.cjs migrate:latest --env production
exec node dist/src/app.js
