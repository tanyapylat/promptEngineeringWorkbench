import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/data/spec-versions?projectId=xxx - List spec versions for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 },
      );
    }

    const specVersions = await prisma.specVersion.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
    });

    return NextResponse.json(specVersions);
  } catch (error) {
    console.error("Error fetching spec versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch spec versions" },
      { status: 500 },
    );
  }
}

// POST /api/data/spec-versions - Create a new spec version
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, content, freeformText } = body;

    if (!projectId || !content || !freeformText) {
      return NextResponse.json(
        { error: "projectId, content, and freeformText are required" },
        { status: 400 },
      );
    }

    // Get the next version number
    const existingVersions = await prisma.specVersion.findMany({
      where: { projectId },
      orderBy: { version: "desc" },
      take: 1,
    });

    const version =
      existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

    const specVersion = await prisma.specVersion.create({
      data: {
        projectId,
        version,
        status: "draft",
        content,
        freeformText,
      },
    });

    return NextResponse.json(specVersion, { status: 201 });
  } catch (error) {
    console.error("Error creating spec version:", error);
    return NextResponse.json(
      { error: "Failed to create spec version" },
      { status: 500 },
    );
  }
}
