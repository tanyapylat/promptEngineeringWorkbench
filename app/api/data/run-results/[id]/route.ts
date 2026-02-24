import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/run-results/[id] - Update a run result
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { output, labels } = body;

    const updateData: any = {};
    if (output !== undefined) updateData.output = output;
    if (labels !== undefined) updateData.labels = labels;

    const runResult = await prisma.runResult.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(runResult);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Run result not found" },
        { status: 404 },
      );
    }
    console.error("Error updating run result:", error);
    return NextResponse.json(
      { error: "Failed to update run result" },
      { status: 500 },
    );
  }
}

// DELETE /api/data/run-results/[id] - Delete a run result
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.runResult.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Run result not found" },
        { status: 404 },
      );
    }
    console.error("Error deleting run result:", error);
    return NextResponse.json(
      { error: "Failed to delete run result" },
      { status: 500 },
    );
  }
}
