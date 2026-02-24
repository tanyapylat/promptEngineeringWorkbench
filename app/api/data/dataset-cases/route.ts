import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/data/dataset-cases?projectId=xxx - List dataset cases for a project
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

    const datasetCases = await prisma.datasetCase.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(datasetCases);
  } catch (error) {
    console.error("Error fetching dataset cases:", error);
    return NextResponse.json(
      { error: "Failed to fetch dataset cases" },
      { status: 500 },
    );
  }
}

// POST /api/data/dataset-cases - Create new dataset cases (batch)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cases } = body;

    if (!Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json(
        { error: "cases array is required" },
        { status: 400 },
      );
    }

    const datasetCases = await prisma.datasetCase.createMany({
      data: cases,
    });

    // Fetch the created cases to return them
    const projectIds = [...new Set(cases.map((c: any) => c.projectId))];
    const createdCases = await prisma.datasetCase.findMany({
      where: {
        projectId: { in: projectIds },
      },
      orderBy: { createdAt: "desc" },
      take: cases.length,
    });

    return NextResponse.json(createdCases, { status: 201 });
  } catch (error) {
    console.error("Error creating dataset cases:", error);
    return NextResponse.json(
      { error: "Failed to create dataset cases" },
      { status: 500 },
    );
  }
}
