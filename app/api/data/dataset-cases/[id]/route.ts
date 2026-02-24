import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/dataset-cases/[id] - Update a dataset case
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { input, expectedOutput, labels } = body;

    const updateData: any = {};
    if (input !== undefined) updateData.input = input;
    if (expectedOutput !== undefined) updateData.expectedOutput = expectedOutput;
    if (labels !== undefined) updateData.labels = labels;

    const datasetCase = await prisma.datasetCase.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(datasetCase);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Dataset case not found" },
        { status: 404 },
      );
    }
    console.error("Error updating dataset case:", error);
    return NextResponse.json(
      { error: "Failed to update dataset case" },
      { status: 500 },
    );
  }
}

// DELETE /api/data/dataset-cases/[id] - Delete a dataset case
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.datasetCase.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Dataset case not found" },
        { status: 404 },
      );
    }
    console.error("Error deleting dataset case:", error);
    return NextResponse.json(
      { error: "Failed to delete dataset case" },
      { status: 500 },
    );
  }
}
