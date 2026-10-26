#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/20a3b20333b18a8ef1841177609e50b1a35d791bbcc3db74772211c720ab0b77/contract.js';
import startContract from '../../snapshots/20a3b20333b18a8ef1841177609e50b1a35d791bbcc3db74772211c720ab0b77/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/24859d55f665cfb270d8dde4aef8468274a6b46d26edfd63dd582c398a2e4f95/contract.js';
import endContract from '../../snapshots/24859d55f665cfb270d8dde4aef8468274a6b46d26edfd63dd582c398a2e4f95/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AdminLoginAttempt',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'AdminSession',
        columns: [
          col('adminId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'AdminSession',
        constraint: 'AdminSession_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AdminLoginAttempt',
        index: 'AdminLoginAttempt_email_createdAt_idx_6e3c0d8a',
        columns: ['email', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AdminSession',
        index: 'AdminSession_adminId_idx_530179db',
        columns: ['adminId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AdminSession',
        foreignKey: {
          name: 'AdminSession_adminId_fkey',
          columns: ['adminId'],
          references: { schema: 'public', table: 'Admin', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
