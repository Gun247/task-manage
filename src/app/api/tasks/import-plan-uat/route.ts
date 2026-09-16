import { NextResponse } from "next/server";
import {
  createTask,
  getDefaultPriority,
  getDefaultProject,
  getDefaultStatus,
  getProjectById,
  listTasks,
  markTasksSource,
} from "@/lib/db";
import {
  fetchPlanUatCsv,
  normalizeTaskName,
  parseCsv,
  parsePlanUatSheet,
} from "@/lib/plan-uat-import";
import { TASK_SOURCE_PLAN_UAT } from "@/lib/task-source";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string;
      dryRun?: boolean;
    };

    const [defaultStatus, defaultPriority, defaultProject] = await Promise.all([
      getDefaultStatus(),
      getDefaultPriority(),
      getDefaultProject(),
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

    const projectId = body.projectId ?? defaultProject.id;
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }

    const csv = await fetchPlanUatCsv();
    const parsed = parsePlanUatSheet(parseCsv(csv));
    const existing = await listTasks(projectId);
    const existingByName = new Map(
      existing.map((task) => [normalizeTaskName(task.name), task] as const),
    );

    const toImport = [];
    const sourceBackfillIds: string[] = [];
    let skipped = 0;

    for (const task of parsed) {
      const match = existingByName.get(normalizeTaskName(task.name));
      if (match) {
        skipped += 1;
        if (!match.source) {
          sourceBackfillIds.push(match.id);
        }
        continue;
      }
      toImport.push(task);
    }

    if (body.dryRun) {
      return NextResponse.json({
        dryRun: true,
        sourceCount: parsed.length,
        imported: 0,
        skipped,
        wouldImport: toImport.length,
        wouldMarkSource: sourceBackfillIds.length,
        sample: toImport.slice(0, 10).map((task) => ({
          name: task.name,
          uatDate: task.uatDate,
          prdDate: task.prdDate,
          section: task.section,
        })),
      });
    }

    const markedSource = await markTasksSource(
      sourceBackfillIds,
      TASK_SOURCE_PLAN_UAT,
    );

    const importedNames: string[] = [];
    for (const task of toImport) {
      await createTask({
        name: task.name,
        description: task.description,
        remarks: task.remarks,
        source: TASK_SOURCE_PLAN_UAT,
        uatDate: task.uatDate,
        prdDate: task.prdDate,
        projectId,
        priorityId: defaultPriority.id,
        statusId: defaultStatus.id,
      });
      importedNames.push(task.name);
      existingByName.set(normalizeTaskName(task.name), {
        id: "new",
        name: task.name,
        source: TASK_SOURCE_PLAN_UAT,
      } as (typeof existing)[number]);
    }

    return NextResponse.json({
      sourceCount: parsed.length,
      imported: importedNames.length,
      skipped,
      markedSource,
      importedNames: importedNames.slice(0, 50),
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
