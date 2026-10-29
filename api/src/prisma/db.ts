import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import { loadDatabaseUrl } from "./database-config.js";
import type { Contract } from "./contract.d.js";
import contractJson from "./contract.json" with { type: "json" };

const contract = contractFromJson<Contract>(contractJson);

export const db = postgres({
  contract,
  url: loadDatabaseUrl(),
});
