#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/09327caa102587aafecf1c91ad845a15a44494ef4d2eff38ba0b9b80b58bcc16/contract.js';
import startContract from '../../snapshots/09327caa102587aafecf1c91ad845a15a44494ef4d2eff38ba0b9b80b58bcc16/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/beceb30746f7431c8b5918d86e9f1dd49b9c8f1c29a1bb44c010588c44c5f901/contract.js';
import endContract from '../../snapshots/beceb30746f7431c8b5918d86e9f1dd49b9c8f1c29a1bb44c010588c44c5f901/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'CourseImage',
        columns: [
          col('bytes', 'bytea', { notNull: true, codecRef: { codecId: 'pg/bytea@1' } }),
          col('courseId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['courseId'])],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CourseImage',
        foreignKey: {
          name: 'CourseImage_courseId_fkey',
          columns: ['courseId'],
          references: { schema: 'public', table: 'Course', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
