#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8ac5cb742d35bd605f4c07a8ca98d8eb0d0da8675bcddb76618b75bfb016eeb8/contract.js';
import startContract from '../../snapshots/8ac5cb742d35bd605f4c07a8ca98d8eb0d0da8675bcddb76618b75bfb016eeb8/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b257486452aea46213a7be6219f99074db5b70ed40a6356f4a777b16e6027ce1/contract.js';
import endContract from '../../snapshots/b257486452aea46213a7be6219f99074db5b70ed40a6356f4a777b16e6027ce1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'EnrollmentEmail',
        columns: [
          col('emailId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('enrollmentId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['emailId'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EnrollmentEmail',
        index: 'EnrollmentEmail_enrollmentId_idx_ee5e79c5',
        columns: ['enrollmentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EnrollmentEmail',
        foreignKey: {
          name: 'EnrollmentEmail_emailId_fkey',
          columns: ['emailId'],
          references: { schema: 'public', table: 'EmailOutbox', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EnrollmentEmail',
        foreignKey: {
          name: 'EnrollmentEmail_enrollmentId_fkey',
          columns: ['enrollmentId'],
          references: { schema: 'public', table: 'Enrollment', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
