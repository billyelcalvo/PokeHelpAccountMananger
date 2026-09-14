import 'dotenv/config';
import { createApp } from './app';
import { createDatabase } from './db';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const host = process.env.HOST ?? '127.0.0.1';
  const db = createDatabase(connectionString);
  await db.$connect();
  const server = createApp(db).listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
  });
  server.on('error', async (error) => {
    console.error('Server failed:', error.message);
    await db.$disconnect();
    process.exitCode = 1;
  });
  const shutdown = () => {
    server.close(async () => { await db.$disconnect(); });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch(() => {
  console.error('Unable to start server. Check DATABASE_URL, PORT and database availability.');
  process.exitCode = 1;
});
