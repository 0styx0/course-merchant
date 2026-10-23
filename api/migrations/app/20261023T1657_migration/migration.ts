#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/63f6902dc5008589d2b1b15ff70ec05d9a838950eaf36a4238387c8747a70f58/contract.js';
import endContract from '../../snapshots/63f6902dc5008589d2b1b15ff70ec05d9a838950eaf36a4238387c8747a70f58/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b257486452aea46213a7be6219f99074db5b70ed40a6356f4a777b16e6027ce1/contract.js';
import startContract from '../../snapshots/b257486452aea46213a7be6219f99074db5b70ed40a6356f4a777b16e6027ce1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'CourseStatus',
        index: 'CourseStatus_courseId_changedAt_idx_fa8d8656',
      }),
      this.addUnique({
        schema: 'public',
        table: 'CourseStatus',
        constraint: 'CourseStatus_courseId_changedAt_key',
        columns: ['courseId', 'changedAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
