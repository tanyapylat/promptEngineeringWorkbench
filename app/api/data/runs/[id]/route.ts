import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/runs/[id] - Update a run
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, label } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (label !== undefined) updateData.label = label;

    const run = await prisma.run.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(run);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    console.error("Error updating run:", error);
    return NextResponse.json(
      { error: "Failed to update run" },
      { status: 500 },
    );
  }
}

// DELETE /api/data/runs/[id] - Delete a run
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    await prisma.run.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    console.error("Error deleting run:", error);
    return NextResponse.json(
      { error: "Failed to delete run" },
      { status: 500 },
    );
  }
}
