import {
  getDatabaseMode,
  getSheetsSetupHint,
  isSheetsConfigured,
} from "@/lib/db-config";
import * as collabRepo from "./collaboration-repository";
import * as excelRepo from "./excel-repository";
import * as prismaRepo from "./prisma-repository";
import * as sheetsRepo from "./sheets/repository";

function resolveBackend() {
  const mode = getDatabaseMode();
  if (mode === "sheets" && !isSheetsConfigured()) {
    throw new Error(getSheetsSetupHint());
  }
  if (mode === "excel") return excelRepo;
  if (mode === "sheets") return sheetsRepo;
  return prismaRepo;
}

export async function listProjects() {
  return resolveBackend().listProjects();
}

export async function createProject(
  ...args: Parameters<typeof sheetsRepo.createProject>
) {
  return resolveBackend().createProject(...args);
}

export async function updateProject(
  ...args: Parameters<typeof sheetsRepo.updateProject>
) {
  return resolveBackend().updateProject(...args);
}

export async function deleteProject(
  ...args: Parameters<typeof sheetsRepo.deleteProject>
) {
  return resolveBackend().deleteProject(...args);
}

export async function listPriorities() {
  return resolveBackend().listPriorities();
}

export async function updatePriority(
  ...args: Parameters<typeof sheetsRepo.updatePriority>
) {
  return resolveBackend().updatePriority(...args);
}

export async function listStatuses() {
  return resolveBackend().listStatuses();
}

export async function createStatus(
  ...args: Parameters<typeof sheetsRepo.createStatus>
) {
  return resolveBackend().createStatus(...args);
}

export async function updateStatus(
  ...args: Parameters<typeof sheetsRepo.updateStatus>
) {
  return resolveBackend().updateStatus(...args);
}

export async function deleteStatus(
  ...args: Parameters<typeof sheetsRepo.deleteStatus>
) {
  return resolveBackend().deleteStatus(...args);
}

export async function listTeamMembers() {
  return resolveBackend().listTeamMembers();
}

export async function createTeamMember(
  ...args: Parameters<typeof sheetsRepo.createTeamMember>
) {
  return resolveBackend().createTeamMember(...args);
}

export async function updateTeamMember(
  ...args: Parameters<typeof sheetsRepo.updateTeamMember>
) {
  return resolveBackend().updateTeamMember(...args);
}

export async function findTeamMemberByEmployeeId(employeeId: string) {
  if (getDatabaseMode() !== "sqlite") {
    const members = await listTeamMembers();
    const needle = employeeId.trim().toLowerCase();
    return (
      members.find(
        (member: { employeeId?: string; isActive?: boolean }) =>
          member.isActive !== false &&
          (member.employeeId ?? "").trim().toLowerCase() === needle,
      ) ?? null
    );
  }
  return prismaRepo.findTeamMemberByEmployeeId(employeeId);
}

export async function deleteTeamMember(
  ...args: Parameters<typeof sheetsRepo.deleteTeamMember>
) {
  return resolveBackend().deleteTeamMember(...args);
}

export async function listTaskTypes() {
  return resolveBackend().listTaskTypes();
}

export async function createTaskType(
  ...args: Parameters<typeof sheetsRepo.createTaskType>
) {
  return resolveBackend().createTaskType(...args);
}

export async function updateTaskType(
  ...args: Parameters<typeof sheetsRepo.updateTaskType>
) {
  return resolveBackend().updateTaskType(...args);
}

export async function deleteTaskType(
  ...args: Parameters<typeof sheetsRepo.deleteTaskType>
) {
  return resolveBackend().deleteTaskType(...args);
}

export async function getDefaultTaskType() {
  return resolveBackend().getDefaultTaskType();
}

export async function listTasks(
  ...args: Parameters<typeof sheetsRepo.listTasks>
) {
  return resolveBackend().listTasks(...args);
}

export async function getTaskById(
  ...args: Parameters<typeof sheetsRepo.getTaskById>
) {
  return resolveBackend().getTaskById(...args);
}

export async function listTimelineTasks(
  ...args: Parameters<typeof sheetsRepo.listTimelineTasks>
) {
  return resolveBackend().listTimelineTasks(...args);
}

export async function createTask(
  ...args: Parameters<typeof sheetsRepo.createTask>
) {
  return resolveBackend().createTask(...args);
}

export async function updateTask(
  ...args: Parameters<typeof sheetsRepo.updateTask>
) {
  return resolveBackend().updateTask(...args);
}

export async function markTasksSource(
  ...args: Parameters<typeof sheetsRepo.markTasksSource>
) {
  return resolveBackend().markTasksSource(...args);
}

export async function bulkUpdateTasks(
  ...args: Parameters<typeof sheetsRepo.bulkUpdateTasks>
) {
  return resolveBackend().bulkUpdateTasks(...args);
}

export async function bulkDeleteTasks(
  ...args: Parameters<typeof sheetsRepo.bulkDeleteTasks>
) {
  return resolveBackend().bulkDeleteTasks(...args);
}

export async function deleteTask(
  ...args: Parameters<typeof sheetsRepo.deleteTask>
) {
  return resolveBackend().deleteTask(...args);
}

export async function createSubtask(
  ...args: Parameters<typeof sheetsRepo.createSubtask>
) {
  return resolveBackend().createSubtask(...args);
}

export async function updateSubtask(
  ...args: Parameters<typeof sheetsRepo.updateSubtask>
) {
  return resolveBackend().updateSubtask(...args);
}

export async function deleteSubtask(
  ...args: Parameters<typeof sheetsRepo.deleteSubtask>
) {
  return resolveBackend().deleteSubtask(...args);
}

export async function getDefaultStatus() {
  return resolveBackend().getDefaultStatus();
}

export async function getDefaultPriority() {
  return resolveBackend().getDefaultPriority();
}

export async function getDefaultProject() {
  return resolveBackend().getDefaultProject();
}

export async function getProjectById(
  ...args: Parameters<typeof sheetsRepo.getProjectById>
) {
  return resolveBackend().getProjectById(...args);
}

export async function listColorThemes() {
  return resolveBackend().listColorThemes();
}

export async function getColorThemeById(
  ...args: Parameters<typeof prismaRepo.getColorThemeById>
) {
  return resolveBackend().getColorThemeById(...args);
}

export async function createColorTheme(
  ...args: Parameters<typeof prismaRepo.createColorTheme>
) {
  return resolveBackend().createColorTheme(...args);
}

export async function updateColorTheme(
  ...args: Parameters<typeof prismaRepo.updateColorTheme>
) {
  return resolveBackend().updateColorTheme(...args);
}

export async function deleteColorTheme(
  ...args: Parameters<typeof prismaRepo.deleteColorTheme>
) {
  return resolveBackend().deleteColorTheme(...args);
}

export async function ensureSheetStructure() {
  return resolveBackend().ensureSheetStructure();
}

export async function seedDefaultData() {
  return resolveBackend().seedDefaultData();
}

function requirePrismaCollaboration() {
  if (getDatabaseMode() !== "sqlite") {
    throw new Error("ฟีเจอร์นี้รองรับเฉพาะโหมด SQLite / Prisma");
  }
}

export async function listTaskComments(
  ...args: Parameters<typeof collabRepo.listTaskComments>
) {
  requirePrismaCollaboration();
  return collabRepo.listTaskComments(...args);
}

export async function createTaskComment(
  ...args: Parameters<typeof collabRepo.createTaskComment>
) {
  requirePrismaCollaboration();
  return collabRepo.createTaskComment(...args);
}

export async function deleteTaskComment(
  ...args: Parameters<typeof collabRepo.deleteTaskComment>
) {
  requirePrismaCollaboration();
  return collabRepo.deleteTaskComment(...args);
}

export async function listTaskLinks(
  ...args: Parameters<typeof collabRepo.listTaskLinks>
) {
  requirePrismaCollaboration();
  return collabRepo.listTaskLinks(...args);
}

export async function createTaskLink(
  ...args: Parameters<typeof collabRepo.createTaskLink>
) {
  requirePrismaCollaboration();
  return collabRepo.createTaskLink(...args);
}

export async function deleteTaskLink(
  ...args: Parameters<typeof collabRepo.deleteTaskLink>
) {
  requirePrismaCollaboration();
  return collabRepo.deleteTaskLink(...args);
}

export async function listTaskWatchers(
  ...args: Parameters<typeof collabRepo.listTaskWatchers>
) {
  requirePrismaCollaboration();
  return collabRepo.listTaskWatchers(...args);
}

export async function setTaskWatching(
  ...args: Parameters<typeof collabRepo.setTaskWatching>
) {
  requirePrismaCollaboration();
  return collabRepo.setTaskWatching(...args);
}

export async function getTaskCollaboration(
  ...args: Parameters<typeof collabRepo.getTaskCollaboration>
) {
  requirePrismaCollaboration();
  return collabRepo.getTaskCollaboration(...args);
}

export async function listNotifications(
  ...args: Parameters<typeof collabRepo.listNotifications>
) {
  requirePrismaCollaboration();
  return collabRepo.listNotifications(...args);
}

export async function markNotificationRead(
  ...args: Parameters<typeof collabRepo.markNotificationRead>
) {
  requirePrismaCollaboration();
  return collabRepo.markNotificationRead(...args);
}

export async function markAllNotificationsRead(
  ...args: Parameters<typeof collabRepo.markAllNotificationsRead>
) {
  requirePrismaCollaboration();
  return collabRepo.markAllNotificationsRead(...args);
}

export async function listSavedFilters(
  ...args: Parameters<typeof collabRepo.listSavedFilters>
) {
  requirePrismaCollaboration();
  return collabRepo.listSavedFilters(...args);
}

export async function createSavedFilter(
  ...args: Parameters<typeof collabRepo.createSavedFilter>
) {
  requirePrismaCollaboration();
  return collabRepo.createSavedFilter(...args);
}

export async function deleteSavedFilter(
  ...args: Parameters<typeof collabRepo.deleteSavedFilter>
) {
  requirePrismaCollaboration();
  return collabRepo.deleteSavedFilter(...args);
}

export { getDatabaseMode } from "@/lib/db-config";
