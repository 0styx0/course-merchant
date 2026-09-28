import { AppService } from './app.service.js';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): Promise<import("@prisma/orm-family-sql/orm-client").DefaultModelRow<import("./prisma/contract.js").Contract, "Course", "public">[]>;
}
