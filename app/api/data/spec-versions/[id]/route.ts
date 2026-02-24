import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/spec-versions/[id] - Update a spec version
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, content, freeformText } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (content) updateData.content = content;
    if (freeformText !== undefined) updateData.freeformText = freeformText;

    // If pinning this version, unpin others in the same project
    if (status === "pinned") {
      const specVersion = await prisma.specVersion.findUnique({
        where: { id },
      });

      if (specVersion) {
        await prisma.specVersion.updateMany({
          where: {
            projectId: specVersion.projectId,
            status: "pinned",
            id: { not: id },
          },
          data: { status: "draft" },
        });
      }
    }

    const updatedSpecVersion = await prisma.specVersion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedSpecVersion);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Spec version not found" },
        { status: 404 },
      );
    }
    console.error("Error updating spec version:", error);
    return NextResponse.json(
      { error: "Failed to update spec version" },
      { status: 500 },
    );
  }
}

// DELETE /api/data/spec-versions/[id] - Delete a spec version
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    await prisma.specVersion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Spec version not found" },
        { status: 404 },
      );
    }
    console.error("Error deleting spec version:", error);
    return NextResponse.json(
      { error: "Failed to delete spec version" },
      { status: 500 },
    );
  }
}
