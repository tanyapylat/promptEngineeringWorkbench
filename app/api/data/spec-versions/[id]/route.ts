import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/data/spec-versions/[id] - Update a spec version
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, isPinned, content, comment } = body;

    // Get the spec version to validate editability
    const specVersion = await prisma.specVersion.findUnique({
      where: { id },
    });

    if (!specVersion) {
      return NextResponse.json(
        { error: "Spec version not found" },
        { status: 404 },
      );
    }

    // Only allow editing draft versions (unless changing status or isPinned)
    if (content !== undefined || comment !== undefined) {
      if (specVersion.status === "committed") {
        return NextResponse.json(
          { error: "Cannot edit committed version. Create a new draft instead." },
          { status: 403 },
        );
      }
    }

    const updateData: any = {};
    if (status !== undefined) {
      // Validate status transitions
      if (status === "committed" && specVersion.status === "draft") {
        // Committing a draft - require non-empty comment
        if (!comment && !specVersion.comment.trim()) {
          return NextResponse.json(
            { error: "Cannot commit without a version comment" },
            { status: 400 },
          );
        }
        updateData.status = "committed";
        
        // If this is the first committed version, auto-pin it
        const committedVersions = await prisma.specVersion.findMany({
          where: { 
            projectId: specVersion.projectId,
            status: "committed"
          },
        });
        
        if (committedVersions.length === 0) {
          updateData.isPinned = true;
        }
      } else if (status === "draft" && specVersion.status === "committed") {
        return NextResponse.json(
          { error: "Cannot change committed version back to draft" },
          { status: 400 },
        );
      }
    }
    
    if (isPinned !== undefined) {
      // Only committed versions can be pinned
      if (isPinned && (status !== "committed" && specVersion.status !== "committed")) {
        return NextResponse.json(
          { error: "Only committed versions can be pinned" },
          { status: 400 },
        );
      }
      
      // If pinning this version, unpin all others in the project
      if (isPinned) {
        await prisma.specVersion.updateMany({
          where: {
            projectId: specVersion.projectId,
            isPinned: true,
            id: { not: id },
          },
          data: { isPinned: false },
        });
      }
      
      updateData.isPinned = isPinned;
    }
    
    if (content !== undefined) updateData.content = content;
    if (comment !== undefined) updateData.comment = comment;

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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get the spec version to validate deletion
    const specVersion = await prisma.specVersion.findUnique({
      where: { id },
    });

    if (!specVersion) {
      return NextResponse.json(
        { error: "Spec version not found" },
        { status: 404 },
      );
    }

    // Only allow deleting draft versions
    if (specVersion.status === "committed") {
      return NextResponse.json(
        { error: "Cannot delete committed version. Only draft versions can be deleted." },
        { status: 403 },
      );
    }

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
