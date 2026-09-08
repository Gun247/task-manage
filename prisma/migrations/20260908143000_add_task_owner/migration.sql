-- AlterTable
ALTER TABLE "Task" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");
