import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/projects/[id] - Update a project
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    const project = await prisma.project.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(project);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

// DELETE /api/data/projects/[id] - Delete a project (cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}
