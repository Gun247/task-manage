-- CreateTable
CREATE TABLE "SubtaskAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subtaskId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubtaskAssignee_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "Subtask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubtaskAssignee_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SubtaskAssignee_subtaskId_sortOrder_idx" ON "SubtaskAssignee"("subtaskId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SubtaskAssignee_subtaskId_teamMemberId_key" ON "SubtaskAssignee"("subtaskId", "teamMemberId");
