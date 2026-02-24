import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/data/eval-definitions?projectId=xxx - List eval definitions for a project
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

    const evalDefinitions = await prisma.evalDefinition.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(evalDefinitions);
  } catch (error) {
    console.error("Error fetching eval definitions:", error);
    return NextResponse.json(
      { error: "Failed to fetch eval definitions" },
      { status: 500 },
    );
  }
}

// POST /api/data/eval-definitions - Create a new eval definition
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      specVersion,
      name,
      description,
      scoreMode,
      judgeInstruction,
    } = body;

    if (
      !projectId ||
      !specVersion ||
      !name ||
      !description ||
      !scoreMode ||
      !judgeInstruction
    ) {
      return NextResponse.json(
        {
          error:
            "projectId, specVersion, name, description, scoreMode, and judgeInstruction are required",
        },
        { status: 400 },
      );
    }

    const evalDefinition = await prisma.evalDefinition.create({
      data: {
        projectId,
        specVersion,
        name,
        description,
        scoreMode,
        judgeInstruction,
      },
    });

    return NextResponse.json(evalDefinition, { status: 201 });
  } catch (error) {
    console.error("Error creating eval definition:", error);
    return NextResponse.json(
      { error: "Failed to create eval definition" },
      { status: 500 },
    );
  }
}
