import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/prompts/[id] - Update a prompt
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, content } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;

    const prompt = await prisma.prompt.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(prompt);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 },
    );
  }
}

// DELETE /api/data/prompts/[id] - Delete a prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.prompt.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 },
    );
  }
}
