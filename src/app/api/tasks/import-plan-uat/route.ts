import { NextResponse } from "next/server";
import {
  createTask,
  getDefaultPriority,
  getDefaultProject,
  getDefaultStatus,
  getProjectById,
  listStatuses,
  listTasks,
  markTasksSource,
} from "@/lib/db";
import {
  fetchPlanUatCsv,
  isIsoDate,
  normalizeTaskName,
  parseCsv,
  parsePlanUatSheet,
  taskMatchesPlanUatRange,
  type PlanUatDateField,
} from "@/lib/plan-uat-import";
import { TASK_SOURCE_PLAN_UAT } from "@/lib/task-source";

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
  const items: { name: string; statusId: string }[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const name = "name" in entry ? entry.name : undefined;
    const statusId = "statusId" in entry ? entry.statusId : undefined;
    if (typeof name !== "string" || !name.trim()) return null;
    if (typeof statusId !== "string" || !statusId.trim()) return null;
    items.push({ name: name.trim(), statusId });
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

    const [defaultStatus, defaultPriority, defaultProject, statuses] =
      await Promise.all([
        getDefaultStatus(),
        getDefaultPriority(),
        getDefaultProject(),
        listStatuses(),
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
        .map((task) => ({
          name: task.name,
          section: task.section,
          uatDate: task.uatDate,
          prdDate: task.prdDate,
          sheetRow: task.sheetRow,
          alreadyExists: existingByName.has(normalizeTaskName(task.name)),
        }))
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

    const requested = new Map<string, string>();
    for (const item of items) {
      requested.set(normalizeTaskName(item.name), item.statusId);
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
    }[] = [];
    let skipped = 0;

    for (const task of parsed) {
      const key = normalizeTaskName(task.name);
      const statusId = requested.get(key);
      if (!statusId) continue;

      const match = existingByName.get(key);
      if (match) {
        skipped += 1;
        if (!match.source) sourceBackfillIds.push(match.id);
        requested.delete(key);
        continue;
      }

      toImport.push({ task, statusId });
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
      });
    }

    return NextResponse.json({
      sourceCount: parsed.length,
      imported: toImport.length,
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
