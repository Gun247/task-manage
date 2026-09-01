import { NextResponse } from "next/server";
import { createProject, getDatabaseMode, listProjects, seedDefaultData } from "@/lib/db";

export async function GET() {
  try {
    let projects = await listProjects();
    if (
      (getDatabaseMode() === "sqlite" || getDatabaseMode() === "excel") &&
      projects.length === 0
    ) {
      await seedDefaultData();
      projects = await listProjects();
    }
    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = await createProject({
      name: body.name.trim(),
      description: body.description?.trim(),
      color: body.color,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 },
    );
  }
}
