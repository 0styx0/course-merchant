#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/beceb30746f7431c8b5918d86e9f1dd49b9c8f1c29a1bb44c010588c44c5f901/contract.js';
import startContract from '../../snapshots/beceb30746f7431c8b5918d86e9f1dd49b9c8f1c29a1bb44c010588c44c5f901/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dc546a9c053e82915b459b15a23f3b6d8d69a91850e3fcd0d4f3650e73859266/contract.js';
import endContract from '../../snapshots/dc546a9c053e82915b459b15a23f3b6d8d69a91850e3fcd0d4f3650e73859266/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.alterColumnType({
        schema: 'public',
        table: 'Course',
        column: 'description',
        type: 'jsonb',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
