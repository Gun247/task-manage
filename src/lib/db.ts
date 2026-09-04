import {
  getDatabaseMode,
  getSheetsSetupHint,
  isSheetsConfigured,
} from "@/lib/db-config";
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

export async function ensureSheetStructure() {
  return resolveBackend().ensureSheetStructure();
}

export async function seedDefaultData() {
  return resolveBackend().seedDefaultData();
}

export { getDatabaseMode } from "@/lib/db-config";
