import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Reemplaza la clave `prisma` del package.json, que Prisma 7 elimina.
//
// Ojo: en cuanto existe este archivo, Prisma deja de leer el .env por su cuenta
// ("Prisma config detected, skipping environment variable loading"). Hay que cargarlo
// a mano o todos los comandos fallan con "Environment variable not found".
const env = path.join(process.cwd(), '.env');
if (fs.existsSync(env)) process.loadEnvFile(env);

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
