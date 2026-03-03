/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const migrationsDir = path.join(__dirname, '..', 'migrations');

function splitUpDown(sql) {
  const upMarker = '-- +up';
  const downMarker = '-- +down';

  const upIndex = sql.indexOf(upMarker);
  if (upIndex === -1) {
    throw new Error('Migration file is missing "-- +up" section');
  }

  const downIndex = sql.indexOf(downMarker);

  let upSql;
  let downSql = '';

  if (downIndex === -1) {
    upSql = sql.slice(upIndex + upMarker.length);
  } else {
    upSql = sql.slice(upIndex + upMarker.length, downIndex);
    downSql = sql.slice(downIndex + downMarker.length);
  }

  return {
    upSql: upSql.trim(),
    downSql: downSql.trim(),
  };
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

async function migrateUp(client) {
  await ensureMigrationsTable(client);

  const appliedRes = await client.query(
    'SELECT name FROM schema_migrations ORDER BY name',
  );
  const appliedNames = new Set(appliedRes.rows.map((r) => r.name));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (appliedNames.has(file)) {
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    const { upSql } = splitUpDown(sql);

    if (!upSql) {
      console.log(`Skipping migration ${file}: empty up section`);
      continue;
    }

    console.log(`Applying migration ${file}...`);

    await client.query('BEGIN');
    try {
      await client.query(upSql);
      await client.query(
        'INSERT INTO schema_migrations(name) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      console.log(`Applied migration ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed to apply migration ${file}`, err);
      throw err;
    }
  }

  console.log('Migration up complete.');
}

async function migrateDown(client) {
  await ensureMigrationsTable(client);

  const res = await client.query(
    'SELECT id, name FROM schema_migrations ORDER BY id DESC LIMIT 1',
  );

  if (res.rowCount === 0) {
    console.log('No migrations to roll back.');
    return;
  }

  const { id, name } = res.rows[0];
  const fullPath = path.join(migrationsDir, name);
  const sql = fs.readFileSync(fullPath, 'utf8');
  const { downSql } = splitUpDown(sql);

  if (!downSql) {
    console.log(
      `Migration ${name} has no down section; skipping rollback for this migration.`,
    );
    return;
  }

  console.log(`Rolling back migration ${name}...`);

  await client.query('BEGIN');
  try {
    await client.query(downSql);
    await client.query('DELETE FROM schema_migrations WHERE id = $1', [id]);
    await client.query('COMMIT');
    console.log(`Rolled back migration ${name}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed to roll back migration ${name}`, err);
    throw err;
  }
}

async function main() {
  const direction = process.argv[2] || 'up';

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment.');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    if (direction === 'up') {
      await migrateUp(client);
    } else if (direction === 'down') {
      await migrateDown(client);
    } else {
      console.log('Usage: node scripts/migrate.js [up|down]');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

