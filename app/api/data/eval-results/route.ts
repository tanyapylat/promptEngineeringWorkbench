import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/data/eval-results?runResultId=xxx - List eval results for a run result
// GET /api/data/eval-results?runId=xxx - List eval results for all run results in a run
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runResultId = searchParams.get("runResultId");
    const runId = searchParams.get("runId");

    if (!runResultId && !runId) {
      return NextResponse.json(
        { error: "runResultId or runId is required" },
        { status: 400 },
      );
    }

    let evalResults;

    if (runResultId) {
      evalResults = await prisma.evalResult.findMany({
        where: { runResultId },
        orderBy: { createdAt: "asc" },
      });
    } else if (runId) {
      // Get all run results for this run, then get eval results for those
      const runResults = await prisma.runResult.findMany({
        where: { runId },
        select: { id: true },
      });
      const runResultIds = runResults.map((r) => r.id);

      evalResults = await prisma.evalResult.findMany({
        where: { runResultId: { in: runResultIds } },
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json(evalResults);
  } catch (error) {
    console.error("Error fetching eval results:", error);
    return NextResponse.json(
      { error: "Failed to fetch eval results" },
      { status: 500 },
    );
  }
}

// POST /api/data/eval-results - Create new eval results (batch)
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

    await prisma.evalResult.createMany({
      data: results,
    });

    // Fetch the created results to return them
    const runResultIds = [...new Set(results.map((r: any) => r.runResultId))];
    const createdResults = await prisma.evalResult.findMany({
      where: {
        runResultId: { in: runResultIds },
      },
      orderBy: { createdAt: "desc" },
      take: results.length,
    });

    return NextResponse.json(createdResults, { status: 201 });
  } catch (error) {
    console.error("Error creating eval results:", error);
    return NextResponse.json(
      { error: "Failed to create eval results" },
      { status: 500 },
    );
  }
}
