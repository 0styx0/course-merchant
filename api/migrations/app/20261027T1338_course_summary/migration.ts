#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/09327caa102587aafecf1c91ad845a15a44494ef4d2eff38ba0b9b80b58bcc16/contract.js';
import endContract from '../../snapshots/09327caa102587aafecf1c91ad845a15a44494ef4d2eff38ba0b9b80b58bcc16/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/24859d55f665cfb270d8dde4aef8468274a6b46d26edfd63dd582c398a2e4f95/contract.js';
import startContract from '../../snapshots/24859d55f665cfb270d8dde4aef8468274a6b46d26edfd63dd582c398a2e4f95/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumnWithTemporaryDefault({
        schema: 'public',
        table: 'Course',
        column: 'summary',
        type: 'text',
        temporaryDefault: sql`''`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
