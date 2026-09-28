#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3e9ce147dcdc176ec6a168be4ae2ee061e8adb7da28fa304fc176cf06d6b463d/contract.js';
import { Migration } from '@prisma/orm-postgres/migration';
export default class M extends Migration<never, End> {
    readonly endContractJson: {
        _generated: {
            message: string;
            regenerate: string;
            warning: string;
        };
        capabilities: {
            postgres: {
                distinctOn: boolean;
                jsonAgg: boolean;
                lateral: boolean;
                limit: boolean;
                orderBy: boolean;
                returning: boolean;
            };
            sql: {
                checkConstraint: boolean;
                defaultInInsert: boolean;
                enums: boolean;
                lateral: boolean;
                returning: boolean;
                scalarList: boolean;
            };
        };
        domain: {
            namespaces: {
                public: {
                    models: {
                        Course: {
                            fields: {
                                archivedAt: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                contentUrl: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                createdAt: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                description: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                id: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                startsAt: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                stripePriceId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                stripeProductId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                title: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                            };
                            relations: {
                                enrollments: {
                                    cardinality: string;
                                    on: {
                                        localFields: string[];
                                        targetFields: string[];
                                    };
                                    to: {
                                        model: string;
                                        namespace: string;
                                    };
                                };
                            };
                            storage: {
                                fields: {
                                    archivedAt: {
                                        column: string;
                                    };
                                    contentUrl: {
                                        column: string;
                                    };
                                    createdAt: {
                                        column: string;
                                    };
                                    description: {
                                        column: string;
                                    };
                                    id: {
                                        column: string;
                                    };
                                    startsAt: {
                                        column: string;
                                    };
                                    stripePriceId: {
                                        column: string;
                                    };
                                    stripeProductId: {
                                        column: string;
                                    };
                                    title: {
                                        column: string;
                                    };
                                };
                                namespaceId: string;
                                table: string;
                            };
                        };
                        Customer: {
                            fields: {
                                createdAt: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                email: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                id: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                stripeCustomerId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                            };
                            relations: {
                                enrollments: {
                                    cardinality: string;
                                    on: {
                                        localFields: string[];
                                        targetFields: string[];
                                    };
                                    to: {
                                        model: string;
                                        namespace: string;
                                    };
                                };
                            };
                            storage: {
                                fields: {
                                    createdAt: {
                                        column: string;
                                    };
                                    email: {
                                        column: string;
                                    };
                                    id: {
                                        column: string;
                                    };
                                    stripeCustomerId: {
                                        column: string;
                                    };
                                };
                                namespaceId: string;
                                table: string;
                            };
                        };
                        Enrollment: {
                            fields: {
                                courseId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                customerId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                id: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                purchasedAt: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                stripeCheckoutSessionId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                stripePaymentIntentId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                            };
                            relations: {
                                course: {
                                    cardinality: string;
                                    nullable: boolean;
                                    on: {
                                        localFields: string[];
                                        targetFields: string[];
                                    };
                                    to: {
                                        model: string;
                                        namespace: string;
                                    };
                                };
                                customer: {
                                    cardinality: string;
                                    nullable: boolean;
                                    on: {
                                        localFields: string[];
                                        targetFields: string[];
                                    };
                                    to: {
                                        model: string;
                                        namespace: string;
                                    };
                                };
                            };
                            storage: {
                                fields: {
                                    courseId: {
                                        column: string;
                                    };
                                    customerId: {
                                        column: string;
                                    };
                                    id: {
                                        column: string;
                                    };
                                    purchasedAt: {
                                        column: string;
                                    };
                                    stripeCheckoutSessionId: {
                                        column: string;
                                    };
                                    stripePaymentIntentId: {
                                        column: string;
                                    };
                                };
                                namespaceId: string;
                                table: string;
                            };
                        };
                        ProcessedStripeEvent: {
                            fields: {
                                eventId: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                processedAt: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                                type: {
                                    nullable: boolean;
                                    type: {
                                        codecId: string;
                                        kind: string;
                                    };
                                };
                            };
                            relations: {};
                            storage: {
                                fields: {
                                    eventId: {
                                        column: string;
                                    };
                                    processedAt: {
                                        column: string;
                                    };
                                    type: {
                                        column: string;
                                    };
                                };
                                namespaceId: string;
                                table: string;
                            };
                        };
                    };
                };
            };
        };
        execution: {
            executionHash: string;
            mutations: {
                defaults: {
                    onCreate: {
                        id: string;
                        kind: string;
                    };
                    ref: {
                        column: string;
                        namespace: string;
                        table: string;
                    };
                }[];
            };
        };
        extensions: {};
        meta: {};
        profileHash: string;
        roots: {
            course: {
                model: string;
                namespace: string;
            };
            customer: {
                model: string;
                namespace: string;
            };
            enrollment: {
                model: string;
                namespace: string;
            };
            processedStripeEvent: {
                model: string;
                namespace: string;
            };
        };
        schemaVersion: string;
        storage: {
            namespaces: {
                public: {
                    entries: {
                        table: {
                            course: {
                                columns: {
                                    archivedAt: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    contentUrl: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    createdAt: {
                                        codecId: string;
                                        default: {
                                            expression: string;
                                            kind: string;
                                        };
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    description: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    id: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    startsAt: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    stripePriceId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    stripeProductId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    title: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                };
                                foreignKeys: never[];
                                indexes: {
                                    columns: string[];
                                    name: string;
                                    prefix: string;
                                    unique: boolean;
                                }[];
                                primaryKey: {
                                    columns: string[];
                                };
                                uniques: {
                                    columns: string[];
                                }[];
                            };
                            customer: {
                                columns: {
                                    createdAt: {
                                        codecId: string;
                                        default: {
                                            expression: string;
                                            kind: string;
                                        };
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    email: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    id: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    stripeCustomerId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                };
                                foreignKeys: never[];
                                indexes: never[];
                                primaryKey: {
                                    columns: string[];
                                };
                                uniques: {
                                    columns: string[];
                                }[];
                            };
                            enrollment: {
                                columns: {
                                    courseId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    customerId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    id: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    purchasedAt: {
                                        codecId: string;
                                        default: {
                                            expression: string;
                                            kind: string;
                                        };
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    stripeCheckoutSessionId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    stripePaymentIntentId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                };
                                foreignKeys: {
                                    source: {
                                        columns: string[];
                                        namespaceId: string;
                                        tableName: string;
                                    };
                                    target: {
                                        columns: string[];
                                        namespaceId: string;
                                        tableName: string;
                                    };
                                }[];
                                indexes: {
                                    columns: string[];
                                    name: string;
                                    prefix: string;
                                    unique: boolean;
                                }[];
                                primaryKey: {
                                    columns: string[];
                                };
                                uniques: {
                                    columns: string[];
                                }[];
                            };
                            processedStripeEvent: {
                                columns: {
                                    eventId: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    processedAt: {
                                        codecId: string;
                                        default: {
                                            expression: string;
                                            kind: string;
                                        };
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                    type: {
                                        codecId: string;
                                        nativeType: string;
                                        nullable: boolean;
                                    };
                                };
                                foreignKeys: never[];
                                indexes: never[];
                                primaryKey: {
                                    columns: string[];
                                };
                                uniques: never[];
                            };
                        };
                    };
                    id: string;
                    kind: string;
                };
            };
            storageHash: string;
        };
        target: string;
        targetFamily: string;
    };
    get operations(): Promise<import("@prisma/orm-family-sql/family/control").SqlMigrationPlanOperation<import("node_modules/@prisma/orm-target-postgres/dist/planner-target-details-HkP4RrRO-_xPQVPF0.mjs").t>>[];
}
