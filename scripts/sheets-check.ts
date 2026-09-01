import { config } from "dotenv";
import { getDatabaseMode, getSheetsSetupHint, isSheetsConfigured } from "../src/lib/sheets/config";
import { listProjects, seedDefaultData } from "../src/lib/db";

config({ path: ".env.local" });
config();

async function main() {
  const mode = getDatabaseMode();
  console.log(`Database mode: ${mode}`);

  if (mode === "sheets" && !isSheetsConfigured()) {
    console.error(getSheetsSetupHint());
    process.exit(1);
  }

  if (mode === "sheets") {
    await seedDefaultData();
    const projects = await listProjects();
    console.log(`Connected to Google Sheets. Projects: ${projects.length}`);
    return;
  }

  const projects = await listProjects();
  console.log(`Using SQLite local. Projects: ${projects.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
