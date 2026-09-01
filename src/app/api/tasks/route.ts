import { NextResponse } from "next/server";
import {
  createTask,
  getDefaultPriority,
  getDefaultProject,
  getDefaultStatus,
  getProjectById,
  listTasks,
} from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const tasks = await listTasks(projectId);
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const [defaultStatus, defaultPriority, defaultProject] = await Promise.all([
      getDefaultStatus(),
      getDefaultPriority(),
      getDefaultProject(),
    ]);

    if (!defaultStatus || !defaultPriority || !defaultProject) {
      return NextResponse.json(
        { error: "Missing default status, priority, or project. Run npm run sheets:init." },
        { status: 400 },
      );
    }

    const projectId = body.projectId ?? defaultProject.id;
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }

    const task = await createTask({
      name: body.name,
      description: body.description,
      remarks: body.remarks,
      taskType: body.taskType,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      projectId,
      priorityId: body.priorityId ?? defaultPriority.id,
      statusId: body.statusId ?? defaultStatus.id,
      assigneeId: body.assigneeId ?? null,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task" },
      { status: 500 },
    );
  }
}
