#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2154fe7def425e5940a8d2245914496f163d3ac7f6bdfe1c74be08e2bf96b5a5/contract.js';
import startContract from '../../snapshots/2154fe7def425e5940a8d2245914496f163d3ac7f6bdfe1c74be08e2bf96b5a5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6a69acbae0b46328828144e14f31137dc85aad16b8283d8b0fa0e923a559e6b0/contract.js';
import endContract from '../../snapshots/6a69acbae0b46328828144e14f31137dc85aad16b8283d8b0fa0e923a559e6b0/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_provider_check_9d8d413b',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_status_check_e62c59b9',
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_providerCustomerId_fkey',
        kind: 'foreignKey',
      }),
      this.dropIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_providerCustomerId_idx_5b70cca7',
      }),
      this.dropColumn({ schema: 'public', table: 'Payment', column: 'providerCustomerId' }),
      this.dropTable({ schema: 'public', table: 'PaymentProviderCustomer' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'ProcessedPaymentEvent',
        constraint: 'ProcessedPaymentEvent_provider_check_9d8d413b',
      }),
      this.createTable({
        schema: 'public',
        table: 'EmailOutbox',
        columns: [
          col('attempts', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('nextAttemptAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('payload', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('recipient', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sentAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'EmailOutbox_kind_check_cba6a3d8',
            "\"kind\" IN ('access_granted', 'already_owned', 'access_suspended', 'dispute_alert')",
          ),
          checkExpression(
            'EmailOutbox_status_check_a1bd2f80',
            "\"status\" IN ('pending', 'sent', 'failed')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Enrollment',
        column: col('revokedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Enrollment',
        column: col('suspendedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Payment',
        column: col('refundedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.dropNotNull({ schema: 'public', table: 'Enrollment', column: 'paymentId' }),
      this.setDefault({
        schema: 'public',
        table: 'Payment',
        column: 'createdAt',
        defaultSql: 'DEFAULT (now())',
      }),
      this.dropNotNull({ schema: 'public', table: 'Payment', column: 'providerPaymentId' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_provider_check_ae06b403',
        expression: '"provider" IN (\'stripe\')',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_status_check_3e9c8ca3',
        expression: "\"status\" IN ('pending', 'succeeded', 'expired', 'refunded')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'Payment',
        constraint: 'Payment_provider_providerCheckoutId_key',
        columns: ['provider', 'providerCheckoutId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'ProcessedPaymentEvent',
        constraint: 'ProcessedPaymentEvent_provider_check_ae06b403',
        expression: '"provider" IN (\'stripe\')',
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailOutbox',
        index: 'EmailOutbox_recipient_createdAt_idx_08a7b587',
        columns: ['recipient', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailOutbox',
        index: 'EmailOutbox_status_nextAttemptAt_idx_8ba20615',
        columns: ['status', 'nextAttemptAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Payment',
        index: 'Payment_status_createdAt_idx_58610442',
        columns: ['status', 'createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
