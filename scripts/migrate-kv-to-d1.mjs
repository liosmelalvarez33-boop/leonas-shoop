#!/usr/bin/env node
// Nota: la migración real KV -> D1 se hace vía Worker autenticado:
//   POST /api/admin/migrar  (requiere sesión admin)
// Este archivo queda solo como documentación.
// Para desarrollo local usa:
//   npm run db:migrate:local && npm run db:seed:local
console.log('Usa POST /api/admin/migrar para migrar KV->D1 en producción.');
console.log('En local: npm run db:migrate:local && npm run db:seed:local');
