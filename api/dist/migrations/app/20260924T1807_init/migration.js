#!/usr/bin/env -S node
import endContract from '../../snapshots/3e9ce147dcdc176ec6a168be4ae2ee061e8adb7da28fa304fc176cf06d6b463d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';
export default class M extends Migration {
    endContractJson = endContract;
    get operations() {
        return [
            this.createSchema({ schema: 'public' }),
            this.createTable({
                schema: 'public',
                table: 'course',
                columns: [
                    col('archivedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
                    col('contentUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                    col('createdAt', 'timestamptz', {
                        notNull: true,
                        default: fn('now()'),
                        codecRef: { codecId: 'pg/timestamptz-temporal@1' },
                    }),
                    col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                    col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
                    col('startsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
                    col('stripePriceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                    col('stripeProductId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                    col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                ],
                constraints: [primaryKey(['id'])],
            }),
            this.createTable({
                schema: 'public',
                table: 'customer',
                columns: [
                    col('createdAt', 'timestamptz', {
                        notNull: true,
                        default: fn('now()'),
                        codecRef: { codecId: 'pg/timestamptz-temporal@1' },
                    }),
                    col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                    col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
                    col('stripeCustomerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                ],
                constraints: [primaryKey(['id'])],
            }),
            this.createTable({
                schema: 'public',
                table: 'enrollment',
                columns: [
                    col('courseId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
                    col('customerId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
                    col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
                    col('purchasedAt', 'timestamptz', {
                        notNull: true,
                        default: fn('now()'),
                        codecRef: { codecId: 'pg/timestamptz-temporal@1' },
                    }),
                    col('stripeCheckoutSessionId', 'text', {
                        notNull: true,
                        codecRef: { codecId: 'pg/text@1' },
                    }),
                    col('stripePaymentIntentId', 'text', {
                        notNull: true,
                        codecRef: { codecId: 'pg/text@1' },
                    }),
                ],
                constraints: [primaryKey(['id'])],
            }),
            this.createTable({
                schema: 'public',
                table: 'processedStripeEvent',
                columns: [
                    col('eventId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                    col('processedAt', 'timestamptz', {
                        notNull: true,
                        default: fn('now()'),
                        codecRef: { codecId: 'pg/timestamptz-temporal@1' },
                    }),
                    col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
                ],
                constraints: [primaryKey(['eventId'])],
            }),
            this.addUnique({
                schema: 'public',
                table: 'course',
                constraint: 'course_stripeProductId_key',
                columns: ['stripeProductId'],
            }),
            this.addUnique({
                schema: 'public',
                table: 'course',
                constraint: 'course_stripePriceId_key',
                columns: ['stripePriceId'],
            }),
            this.addUnique({
                schema: 'public',
                table: 'customer',
                constraint: 'customer_email_key',
                columns: ['email'],
            }),
            this.addUnique({
                schema: 'public',
                table: 'customer',
                constraint: 'customer_stripeCustomerId_key',
                columns: ['stripeCustomerId'],
            }),
            this.addUnique({
                schema: 'public',
                table: 'enrollment',
                constraint: 'enrollment_stripeCheckoutSessionId_key',
                columns: ['stripeCheckoutSessionId'],
            }),
            this.addUnique({
                schema: 'public',
                table: 'enrollment',
                constraint: 'enrollment_stripePaymentIntentId_key',
                columns: ['stripePaymentIntentId'],
            }),
            this.addUnique({
                schema: 'public',
                table: 'enrollment',
                constraint: 'enrollment_courseId_customerId_key',
                columns: ['courseId', 'customerId'],
            }),
            this.createIndex({
                schema: 'public',
                table: 'course',
                index: 'course_startsAt_idx_5ff0df68',
                columns: ['startsAt'],
            }),
            this.createIndex({
                schema: 'public',
                table: 'enrollment',
                index: 'enrollment_courseId_idx_12f72d2a',
                columns: ['courseId'],
            }),
            this.createIndex({
                schema: 'public',
                table: 'enrollment',
                index: 'enrollment_customerId_idx_b2a8a46c',
                columns: ['customerId'],
            }),
            this.addForeignKey({
                schema: 'public',
                table: 'enrollment',
                foreignKey: {
                    name: 'enrollment_courseId_fkey',
                    columns: ['courseId'],
                    references: { schema: 'public', table: 'course', columns: ['id'] },
                },
            }),
            this.addForeignKey({
                schema: 'public',
                table: 'enrollment',
                foreignKey: {
                    name: 'enrollment_customerId_fkey',
                    columns: ['customerId'],
                    references: { schema: 'public', table: 'customer', columns: ['id'] },
                },
            }),
        ];
    }
}
MigrationCLI.run(import.meta.url, M);
//# sourceMappingURL=migration.js.map