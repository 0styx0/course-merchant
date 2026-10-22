#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8ac5cb742d35bd605f4c07a8ca98d8eb0d0da8675bcddb76618b75bfb016eeb8/contract.js';
import endContract from '../../snapshots/8ac5cb742d35bd605f4c07a8ca98d8eb0d0da8675bcddb76618b75bfb016eeb8/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a7ac2c29656f076d765668c1b715305057fd7623b36c11ceab4d4380ccbd5485/contract.js';
import startContract from '../../snapshots/a7ac2c29656f076d765668c1b715305057fd7623b36c11ceab4d4380ccbd5485/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'CoursePrice',
        index: 'CoursePrice_courseId_effectiveAt_idx_89f66b61',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
