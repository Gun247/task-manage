-- AlterTable
ALTER TABLE "Task" ADD COLUMN "tags" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "TagOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TagOption_name_key" ON "TagOption"("name");
