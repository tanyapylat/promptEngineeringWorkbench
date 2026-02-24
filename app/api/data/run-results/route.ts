import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/data/run-results?runId=xxx - List run results for a run
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json(
        { error: "runId is required" },
        { status: 400 },
      );
    }

    const runResults = await prisma.runResult.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(runResults);
  } catch (error) {
    console.error("Error fetching run results:", error);
    return NextResponse.json(
      { error: "Failed to fetch run results" },
      { status: 500 },
    );
  }
}

// POST /api/data/run-results - Create new run results (batch)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { results } = body;

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "results array is required" },
        { status: 400 },
      );
    }

    await prisma.runResult.createMany({
      data: results,
    });

    // Fetch the created results to return them
    const runIds = [...new Set(results.map((r: any) => r.runId))];
    const createdResults = await prisma.runResult.findMany({
      where: {
        runId: { in: runIds },
      },
      orderBy: { createdAt: "desc" },
      take: results.length,
    });

    return NextResponse.json(createdResults, { status: 201 });
  } catch (error) {
    console.error("Error creating run results:", error);
    return NextResponse.json(
      { error: "Failed to create run results" },
      { status: 500 },
    );
  }
}
