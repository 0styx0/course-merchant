#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1be191f6347c615efed1e699530d2f009196f7a0a3245f4221efd0af618768d6/contract.js';
import endContract from '../../snapshots/1be191f6347c615efed1e699530d2f009196f7a0a3245f4221efd0af618768d6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dc546a9c053e82915b459b15a23f3b6d8d69a91850e3fcd0d4f3650e73859266/contract.js';
import startContract from '../../snapshots/dc546a9c053e82915b459b15a23f3b6d8d69a91850e3fcd0d4f3650e73859266/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, sql } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';

const { sql: db, contract } = postgres({ contract: contractFromJson<End>(endContract) });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dataTransform(contract, 'delete-dispute-alert-emails', {
        check: () =>
          db.public.EmailOutbox.select('id')
            .where((f, fns) => fns.eq(f.kind, 'dispute_alert'))
            .limit(1),
        run: () =>
          db.public.EmailOutbox.delete().where((f, fns) => fns.eq(f.kind, 'dispute_alert')),
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'EmailOutbox',
        constraint: 'EmailOutbox_kind_check_cba6a3d8',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'EmailOutbox',
        constraint: 'EmailOutbox_kind_check_1434f8a5',
        expression: sql`"kind" IN ('access_granted', 'already_owned', 'access_suspended')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
