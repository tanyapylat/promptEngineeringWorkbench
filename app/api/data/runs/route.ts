import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/data/runs?projectId=xxx - List runs for a project
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

    const runs = await prisma.run.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 },
    );
  }
}

// POST /api/data/runs - Create a new run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      projectId,
      promptId,
      datasetCaseIds,
      evalIds,
      specVersion,
      status,
      label,
    } = body;

    if (
      !projectId ||
      !promptId ||
      !datasetCaseIds ||
      !evalIds ||
      specVersion === undefined ||
      !status
    ) {
      return NextResponse.json(
        {
          error:
            "projectId, promptId, datasetCaseIds, evalIds, specVersion, and status are required",
        },
        { status: 400 },
      );
    }

    const run = await prisma.run.create({
      data: {
        ...(id && { id }), // Include id if provided
        projectId,
        promptId,
        datasetCaseIds,
        evalIds,
        specVersion,
        status,
        label,
      },
    });

    return NextResponse.json(run, { status: 201 });
  } catch (error) {
    console.error("Error creating run:", error);
    return NextResponse.json(
      { error: "Failed to create run" },
      { status: 500 },
    );
  }
}
