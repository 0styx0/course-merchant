#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/20a3b20333b18a8ef1841177609e50b1a35d791bbcc3db74772211c720ab0b77/contract.js';
import endContract from '../../snapshots/20a3b20333b18a8ef1841177609e50b1a35d791bbcc3db74772211c720ab0b77/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/63f6902dc5008589d2b1b15ff70ec05d9a838950eaf36a4238387c8747a70f58/contract.js';
import startContract from '../../snapshots/63f6902dc5008589d2b1b15ff70ec05d9a838950eaf36a4238387c8747a70f58/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Admin',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Admin',
        constraint: 'Admin_email_key',
        columns: ['email'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
