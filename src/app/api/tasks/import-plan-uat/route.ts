import { NextResponse } from "next/server";
import {
  createTask,
  getDefaultPriority,
  getDefaultProject,
  getDefaultStatus,
  getProjectById,
  listStatuses,
  listTasks,
  listTeamMembers,
  markTasksSource,
  updateTask,
} from "@/lib/db";
import {
  fetchPlanUatCsv,
  isIsoDate,
  mapPlanUatToAppStatus,
  matchAssigneeNickname,
  normalizeTaskName,
  parseCsv,
  parsePlanUatSheet,
  taskMatchesPlanUatRange,
  type PlanUatDateField,
} from "@/lib/plan-uat-import";
import { TASK_SOURCE_PLAN_UAT } from "@/lib/task-source";

function preferLaterIso(
  current: string | null | undefined,
  incoming: string | null | undefined,
) {
  if (!incoming) return current ?? null;
  if (!current) return incoming;
  return incoming >= current ? incoming : current;
}

function mergeAssigneeIdLists(current: string[], incoming: string[]) {
  const merged = [...current];
  for (const id of incoming) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

function parseDateField(value: unknown): PlanUatDateField {
  if (value === "uat" || value === "prd" || value === "either") return value;
  return "either";
}

function parseBound(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !isIsoDate(value)) return undefined;
  return value;
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) return null;
  const items: {
    name: string;
    statusId: string;
    assigneeIds?: string[];
  }[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const name = "name" in entry ? entry.name : undefined;
    const statusId = "statusId" in entry ? entry.statusId : undefined;
    if (typeof name !== "string" || !name.trim()) return null;
    if (typeof statusId !== "string" || !statusId.trim()) return null;
    const assigneeIds =
      "assigneeIds" in entry && Array.isArray(entry.assigneeIds)
        ? entry.assigneeIds.filter(
            (id): id is string => typeof id === "string" && Boolean(id.trim()),
          )
        : undefined;
    items.push({
      name: name.trim(),
      statusId,
      ...(assigneeIds ? { assigneeIds } : {}),
    });
  }
  return items;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string;
      preview?: boolean;
      dateFrom?: unknown;
      dateTo?: unknown;
      dateField?: unknown;
      items?: unknown;
    };

    const [
      defaultStatus,
      defaultPriority,
      defaultProject,
      statuses,
      teamMembers,
    ] = await Promise.all([
      getDefaultStatus(),
      getDefaultPriority(),
      getDefaultProject(),
      listStatuses(),
      listTeamMembers(),
    ]);

    if (!defaultStatus || !defaultPriority || !defaultProject) {
      return NextResponse.json(
        {
          error:
            "Missing default status, priority, or project. Run npm run excel:init or sheets:init.",
        },
        { status: 400 },
      );
    }

    if (statuses.length === 0) {
      return NextResponse.json(
        { error: "ยังไม่มีสถานะให้เลือก" },
        { status: 400 },
      );
    }

    const projectId = body.projectId ?? defaultProject.id;
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }

    const statusIds = new Set(statuses.map((status) => status.id));
    const statusByName = new Map(
      statuses.map((status) => [status.name, status] as const),
    );
    const memberNicknames = teamMembers.map((member) => member.nickname);
    const memberByNickname = new Map(
      teamMembers.map((member) => [member.nickname, member] as const),
    );

    function resolveStatusId(
      uatStatus: string,
      prdStatus: string,
      fallbackId: string,
    ) {
      const appStatus = mapPlanUatToAppStatus(uatStatus, prdStatus);
      return statusByName.get(appStatus)?.id ?? fallbackId;
    }

    function resolveAssigneeIds(names: string[]) {
      const ids: string[] = [];
      for (const name of names) {
        const matched = matchAssigneeNickname(name, memberNicknames);
        if (!matched) continue;
        const member = memberByNickname.get(matched);
        if (member && !ids.includes(member.id)) ids.push(member.id);
      }
      return ids;
    }

    if (body.preview) {
      const dateFrom = parseBound(body.dateFrom);
      const dateTo = parseBound(body.dateTo);
      if (dateFrom === undefined || dateTo === undefined) {
        return NextResponse.json(
          { error: "รูปแบบวันที่ไม่ถูกต้อง" },
          { status: 400 },
        );
      }
      if (!dateFrom && !dateTo) {
        return NextResponse.json(
          { error: "กรุณาเลือกช่วงวันที่" },
          { status: 400 },
        );
      }
      if (dateFrom && dateTo && dateFrom > dateTo) {
        return NextResponse.json(
          { error: "วันเริ่มต้องไม่เกินวันสิ้นสุด" },
          { status: 400 },
        );
      }

      const dateField = parseDateField(body.dateField);
      const csv = await fetchPlanUatCsv();
      const parsed = parsePlanUatSheet(parseCsv(csv));
      const existing = await listTasks(projectId);
      const existingByName = new Map(
        existing.map((task) => [normalizeTaskName(task.name), task] as const),
      );

      const matched = parsed.filter((task) =>
        taskMatchesPlanUatRange(task, dateFrom, dateTo, dateField),
      );

      const items = matched
        .map((task) => {
          const suggestedStatusId = resolveStatusId(
            task.uatStatus,
            task.prdStatus,
            defaultStatus.id,
          );
          const assigneeIds = resolveAssigneeIds(task.assigneeNames);
          return {
            name: task.name,
            section: task.section,
            uatDate: task.uatDate,
            prdDate: task.prdDate,
            sheetRow: task.sheetRow,
            alreadyExists: existingByName.has(normalizeTaskName(task.name)),
            uatStatus: task.uatStatus,
            prdStatus: task.prdStatus,
            suggestedStatusId,
            suggestedStatusName:
              statuses.find((status) => status.id === suggestedStatusId)
                ?.name ?? null,
            assigneeNames: task.assigneeNames,
            assigneeIds,
          };
        })
        .sort((a, b) => {
          if (a.alreadyExists !== b.alreadyExists) {
            return a.alreadyExists ? 1 : -1;
          }
          return (
            (a.uatDate ?? "").localeCompare(b.uatDate ?? "") ||
            (a.prdDate ?? "").localeCompare(b.prdDate ?? "") ||
            a.name.localeCompare(b.name, "th")
          );
        });

      return NextResponse.json({
        preview: true,
        sourceCount: parsed.length,
        matched: items.length,
        newCount: items.filter((item) => !item.alreadyExists).length,
        existingCount: items.filter((item) => item.alreadyExists).length,
        defaultStatusId: defaultStatus.id,
        dateFrom,
        dateTo,
        dateField,
        items,
      });
    }

    const items = parseItems(body.items);
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกรายการจากตัวอย่างก่อนนำเข้า" },
        { status: 400 },
      );
    }
    if (items.length > 1000) {
      return NextResponse.json(
        { error: "นำเข้าได้ไม่เกิน 1,000 รายการต่อครั้ง" },
        { status: 400 },
      );
    }
    if (items.some((item) => !statusIds.has(item.statusId))) {
      return NextResponse.json(
        { error: "สถานะที่เลือกไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const memberIds = new Set(teamMembers.map((member) => member.id));
    if (
      items.some((item) =>
        (item.assigneeIds ?? []).some((id) => !memberIds.has(id)),
      )
    ) {
      return NextResponse.json(
        { error: "สมาชิกที่เลือกไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const requested = new Map<
      string,
      { statusId: string; assigneeIds?: string[] }
    >();
    for (const item of items) {
      requested.set(normalizeTaskName(item.name), {
        statusId: item.statusId,
        assigneeIds: item.assigneeIds,
      });
    }

    const csv = await fetchPlanUatCsv();
    const parsed = parsePlanUatSheet(parseCsv(csv));
    const existing = await listTasks(projectId);
    const existingByName = new Map(
      existing.map((task) => [normalizeTaskName(task.name), task] as const),
    );

    const sourceBackfillIds: string[] = [];
    const toImport: {
      task: (typeof parsed)[number];
      statusId: string;
      assigneeIds: string[];
    }[] = [];
    const toUpdate: {
      id: string;
      task: (typeof parsed)[number];
      statusId: string;
      assigneeIds: string[];
      uatDate: string | null;
      prdDate: string | null;
    }[] = [];
    let skipped = 0;

    for (const task of parsed) {
      const key = normalizeTaskName(task.name);
      const request = requested.get(key);
      if (!request) continue;

      const assigneeIds =
        request.assigneeIds ?? resolveAssigneeIds(task.assigneeNames);
      const match = existingByName.get(key);

      if (match && match.id !== "new") {
        const existingAssignees = (
          match.assignees?.length
            ? match.assignees
            : match.assignee
              ? [match.assignee]
              : []
        ).map((member) => member.id);
        const mergedAssignees = mergeAssigneeIdLists(
          existingAssignees,
          assigneeIds,
        );
        const nextUat = preferLaterIso(match.uatDate, task.uatDate);
        const nextPrd = preferLaterIso(match.prdDate, task.prdDate);
        const datesChanged =
          nextUat !== (match.uatDate ?? null) ||
          nextPrd !== (match.prdDate ?? null);
        const assigneesChanged =
          mergedAssignees.length !== existingAssignees.length ||
          mergedAssignees.some((id) => !existingAssignees.includes(id));
        const statusChanged = match.statusId !== request.statusId;

        if (datesChanged || assigneesChanged || statusChanged || !match.source) {
          toUpdate.push({
            id: match.id,
            task,
            statusId: request.statusId,
            assigneeIds: mergedAssignees,
            uatDate: nextUat,
            prdDate: nextPrd,
          });
          if (!match.source) sourceBackfillIds.push(match.id);
        } else {
          skipped += 1;
        }
        requested.delete(key);
        continue;
      }

      toImport.push({
        task,
        statusId: request.statusId,
        assigneeIds,
      });
      requested.delete(key);
      existingByName.set(key, {
        id: "new",
        name: task.name,
        source: TASK_SOURCE_PLAN_UAT,
      } as (typeof existing)[number]);
    }

    const markedSource = await markTasksSource(
      sourceBackfillIds,
      TASK_SOURCE_PLAN_UAT,
    );

    for (const entry of toUpdate) {
      await updateTask(entry.id, {
        description: entry.task.description || undefined,
        remarks: entry.task.remarks,
        source: TASK_SOURCE_PLAN_UAT,
        uatDate: entry.uatDate,
        prdDate: entry.prdDate,
        statusId: entry.statusId,
        assigneeIds: entry.assigneeIds,
      });
    }

    for (const entry of toImport) {
      await createTask({
        name: entry.task.name,
        description: entry.task.description,
        remarks: entry.task.remarks,
        source: TASK_SOURCE_PLAN_UAT,
        uatDate: entry.task.uatDate,
        prdDate: entry.task.prdDate,
        projectId,
        priorityId: defaultPriority.id,
        statusId: entry.statusId,
        assigneeIds: entry.assigneeIds,
      });
    }

    return NextResponse.json({
      sourceCount: parsed.length,
      imported: toImport.length,
      updated: toUpdate.length,
      skipped,
      missing: requested.size,
      markedSource,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import Plan UAT tasks",
      },
      { status: 500 },
    );
  }
}
