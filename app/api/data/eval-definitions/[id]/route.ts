import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/eval-definitions/[id] - Update an eval definition
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, scoreMode, judgeInstruction } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (scoreMode !== undefined) updateData.scoreMode = scoreMode;
    if (judgeInstruction !== undefined)
      updateData.judgeInstruction = judgeInstruction;

    const evalDefinition = await prisma.evalDefinition.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(evalDefinition);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Eval definition not found" },
        { status: 404 },
      );
    }
    console.error("Error updating eval definition:", error);
    return NextResponse.json(
      { error: "Failed to update eval definition" },
      { status: 500 },
    );
  }
}

// DELETE /api/data/eval-definitions/[id] - Delete an eval definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    await prisma.evalDefinition.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Eval definition not found" },
        { status: 404 },
      );
    }
    console.error("Error deleting eval definition:", error);
    return NextResponse.json(
      { error: "Failed to delete eval definition" },
      { status: 500 },
    );
  }
}
