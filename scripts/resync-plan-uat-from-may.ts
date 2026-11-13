/**
 * One-shot: sync team members from screenshot, delete all project tasks,
 * re-import Plan UAT/PRD from 2026-05-01 with status + assignees.
 *
 * Usage: npx tsx scripts/resync-plan-uat-from-may.ts
 */
import {
  bulkDeleteTasks,
  createTask,
  createTeamMember,
  deleteTeamMember,
  getDefaultPriority,
  getDefaultStatus,
  listStatuses,
  listTasks,
  listTeamMembers,
  updateTeamMember,
} from "../src/lib/db";
import {
  fetchPlanUatCsv,
  mapPlanUatToAppStatus,
  matchAssigneeNickname,
  parseCsv,
  parsePlanUatSheet,
  taskMatchesPlanUatRange,
} from "../src/lib/plan-uat-import";
import { TASK_SOURCE_PLAN_UAT } from "../src/lib/task-source";

const PROJECT_ID = "6646c3f5-c7ec-4e87-bd40-a6a8fd0fccf3";
const DATE_FROM = "2026-05-01";

const DESIRED_MEMBERS: { nickname: string; color: string; aliases: string[] }[] =
  [
    { nickname: "Fame", color: "#374151", aliases: ["frame", "fame"] },
    { nickname: "Gun", color: "#DC2626", aliases: ["gun"] },
    { nickname: "Junior", color: "#92400E", aliases: ["junior"] },
    { nickname: "Mind", color: "#EA580C", aliases: ["mild", "mind"] },
    { nickname: "Breeze", color: "#15803D", aliases: ["breez", "breeze"] },
    { nickname: "Creem", color: "#2563EB", aliases: ["cream", "creem"] },
    {
      nickname: "P' JuAek",
      color: "#0D9488",
      aliases: ["p' juaek", "p juaek", "p aek", "p' aek", "juaek", "p juu", "p' juu"],
    },
    { nickname: "Noon", color: "#7C3AED", aliases: ["noon"] },
    { nickname: "Aern", color: "#84CC16", aliases: ["aern"] },
    { nickname: "waiwai", color: "#D1D5DB", aliases: ["waiwai"] },
  ];

function norm(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function syncMembers() {
  const existing = await listTeamMembers();
  // Also load inactive via update path — listTeamMembers only returns active.
  // We'll match against active set; leftovers get deleted.

  const usedIds = new Set<string>();
  const result: { id: string; nickname: string }[] = [];

  for (const [index, desired] of DESIRED_MEMBERS.entries()) {
    const match = existing.find((member) => {
      if (usedIds.has(member.id)) return false;
      const key = norm(member.nickname);
      return (
        key === norm(desired.nickname) ||
        desired.aliases.includes(key)
      );
    });

    if (match) {
      const updated = await updateTeamMember(match.id, {
        nickname: desired.nickname,
        color: desired.color,
        isActive: true,
        sortOrder: index,
      });
      usedIds.add(match.id);
      result.push({ id: updated.id, nickname: updated.nickname });
      console.log(`updated member: ${match.nickname} → ${desired.nickname}`);
      continue;
    }

    const created = await createTeamMember({
      nickname: desired.nickname,
      color: desired.color,
    });
    await updateTeamMember(created.id, { sortOrder: index });
    usedIds.add(created.id);
    result.push({ id: created.id, nickname: desired.nickname });
    console.log(`created member: ${desired.nickname}`);
  }

  for (const member of existing) {
    if (usedIds.has(member.id)) continue;
    await deleteTeamMember(member.id);
    console.log(`deleted member: ${member.nickname}`);
  }

  return result;
}

async function main() {
  console.log("== sync team members ==");
  const members = await syncMembers();
  const memberNicknames = members.map((member) => member.nickname);
  const memberByNickname = new Map(
    members.map((member) => [member.nickname, member.id] as const),
  );

  console.log("== delete all tasks ==");
  const existingTasks = await listTasks(PROJECT_ID);
  const ids = existingTasks.map((task) => task.id);
  if (ids.length > 0) {
    const deleted = await bulkDeleteTasks(ids);
    console.log(`deleted ${deleted.deleted} tasks`);
  } else {
    console.log("no tasks to delete");
  }

  console.log("== import Plan UAT from", DATE_FROM, "==");
  const [statuses, defaultStatus, defaultPriority] = await Promise.all([
    listStatuses(),
    getDefaultStatus(),
    getDefaultPriority(),
  ]);
  if (!defaultStatus || !defaultPriority) {
    throw new Error("Missing default status/priority");
  }
  const statusByName = new Map(
    statuses.map((status) => [status.name, status.id] as const),
  );

  const csv = await fetchPlanUatCsv();
  const parsed = parsePlanUatSheet(parseCsv(csv));
  const matched = parsed.filter((task) =>
    taskMatchesPlanUatRange(task, DATE_FROM, null, "either"),
  );

  let imported = 0;
  let withAssignees = 0;
  const statusCounts = new Map<string, number>();

  for (const task of matched) {
    const appStatus = mapPlanUatToAppStatus(task.uatStatus, task.prdStatus);
    const statusId =
      statusByName.get(appStatus) ?? defaultStatus.id;
    statusCounts.set(appStatus, (statusCounts.get(appStatus) ?? 0) + 1);

    const assigneeIds: string[] = [];
    for (const name of task.assigneeNames) {
      const matchedName = matchAssigneeNickname(name, memberNicknames);
      if (!matchedName) continue;
      const id = memberByNickname.get(matchedName);
      if (id && !assigneeIds.includes(id)) assigneeIds.push(id);
    }
    if (assigneeIds.length > 0) withAssignees += 1;

    await createTask({
      name: task.name,
      description: task.description,
      remarks: task.remarks,
      source: TASK_SOURCE_PLAN_UAT,
      uatDate: task.uatDate,
      prdDate: task.prdDate,
      projectId: PROJECT_ID,
      priorityId: defaultPriority.id,
      statusId,
      assigneeIds,
    });
    imported += 1;
  }

  console.log({
    sourceParsed: parsed.length,
    matched: matched.length,
    imported,
    withAssignees,
    statusCounts: Object.fromEntries(statusCounts),
    members: members.map((member) => member.nickname),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
