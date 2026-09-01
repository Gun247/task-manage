import { config } from "dotenv";
import { seedDefaultData } from "../src/lib/excel-repository";

config({ path: ".env.local" });
config();

async function main() {
  await seedDefaultData();
  console.log("Excel file initialized with default data.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
