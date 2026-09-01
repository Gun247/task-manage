import { config } from "dotenv";
import { seedDefaultData } from "../src/lib/sheets/repository";

config({ path: ".env.local" });
config();

async function main() {
  await seedDefaultData();
  console.log("Google Sheets initialized with default data.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
