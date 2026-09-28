import { PrismaService } from "./prisma/prisma.service.js";
export declare class AppService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHello(): Promise<import("@prisma/orm-family-sql/orm-client").DefaultModelRow<import("./prisma/contract.js").Contract, "Course", "public">[]>;
}
