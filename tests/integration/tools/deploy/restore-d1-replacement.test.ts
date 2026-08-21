import { afterEach, describe, expect, test } from 'vitest'

import {
  buildD1RestorePlan,
  canonicalizeD1Export,
  createLocalSqliteDatabase
} from '../../../../tools/deploy/restore-d1-replacement'

const authExport = `
PRAGMA foreign_keys=OFF;
CREATE TABLE "user_auth_identities" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "auth0_subject" text NOT NULL,
  "created_at" text NOT NULL
);
CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "auth0_subject" text NOT NULL,
  "email" text NOT NULL,
  "created_at" text NOT NULL,
  "deleted_at" text
);
CREATE TABLE "d1_migrations" ("id" integer PRIMARY KEY, "name" text, "applied_at" integer);
INSERT INTO "user_auth_identities" VALUES ('user_auth_identity_user_1', 'user-1', 'auth0|primary', '2026-01-01');
INSERT INTO "user_auth_identities" VALUES ('secondary-identity', 'user-1', 'google-oauth2|secondary', '2026-01-02');
INSERT INTO "users" VALUES ('user-1', 'auth0|primary', 'primary@example.com', '2026-01-01', NULL);
CREATE TRIGGER "users_insert_primary_auth_identity"
AFTER INSERT ON "users"
WHEN NEW."deleted_at" IS NULL
BEGIN
  INSERT OR IGNORE INTO "user_auth_identities" ("id", "user_id", "auth0_subject", "created_at")
  VALUES ('user_auth_identity_' || replace(NEW."id", '-', '_'), NEW."id", NEW."auth0_subject", NEW."created_at");
END;
`

const targetSchemaSql = `
CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "auth0_subject" text NOT NULL,
  "email" text NOT NULL,
  "created_at" text NOT NULL,
  "deleted_at" text
);
CREATE TABLE "user_auth_identities" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "auth0_subject" text NOT NULL,
  "created_at" text NOT NULL
);
`

const triggerSql = `
CREATE TRIGGER "users_insert_primary_auth_identity"
AFTER INSERT ON "users"
WHEN NEW."deleted_at" IS NULL
BEGIN
  INSERT OR IGNORE INTO "user_auth_identities" ("id", "user_id", "auth0_subject", "created_at")
  VALUES ('user_auth_identity_' || replace(NEW."id", '-', '_'), NEW."id", NEW."auth0_subject", NEW."created_at");
END;
`

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function exportTableRows(database: ReturnType<typeof createLocalSqliteDatabase>, tableName: string, columns: string[]) {
  const select = columns
    .map((column, index) => `quote(${quoteIdentifier(column)}) AS ${quoteIdentifier(`literal_${index}`)}`)
    .join(', ')
  const rows = database.query(`
    SELECT ${select}
    FROM ${quoteIdentifier(tableName)}
    ORDER BY ${columns.map(quoteIdentifier).join(', ')};
  `).all() as Array<Record<string, string>>

  return rows.map(row => `INSERT INTO ${quoteIdentifier(tableName)} (${columns.map(quoteIdentifier).join(', ')}) VALUES (${columns.map((_, index) => row[`literal_${index}`]).join(', ')});`).join('\n')
}

function exportTarget(database: ReturnType<typeof createLocalSqliteDatabase>) {
  return `${targetSchemaSql}
${exportTableRows(database, 'users', ['id', 'auth0_subject', 'email', 'created_at', 'deleted_at'])}
${exportTableRows(database, 'user_auth_identities', ['id', 'user_id', 'auth0_subject', 'created_at'])}
`
}

describe('D1 replacement restore SQLite integration fixture', () => {
  let database: ReturnType<typeof createLocalSqliteDatabase> | undefined

  afterEach(() => {
    database?.close()
    database = undefined
  })

  test('replays trigger-created primary and explicit secondary identities, then compares final exports', () => {
    database = createLocalSqliteDatabase()
    database.exec('PRAGMA foreign_keys = ON;')
    database.exec(targetSchemaSql)
    database.exec(triggerSql)

    const plan = buildD1RestorePlan(authExport)
    database.exec(plan.replaySql)

    expect(database.query(`
      SELECT id, user_id, auth0_subject
      FROM user_auth_identities
      ORDER BY id;
    `).all()).toEqual([
      {
        id: 'secondary-identity',
        user_id: 'user-1',
        auth0_subject: 'google-oauth2|secondary'
      },
      {
        id: 'user_auth_identity_user_1',
        user_id: 'user-1',
        auth0_subject: 'auth0|primary'
      }
    ])
    expect(database.query('PRAGMA foreign_key_check;').all()).toEqual([])

    const sourceEvidence = canonicalizeD1Export(authExport)
    const replacementEvidence = canonicalizeD1Export(exportTarget(database))

    expect(replacementEvidence).toEqual(sourceEvidence)
    expect(plan.replacementCountChunks.every(chunk => chunk.tableNames.length <= 4)).toBe(true)
  })
})
