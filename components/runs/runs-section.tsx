"use client";

import { useState } from "react";
import { useWorkbench } from "@/lib/store";
import type { Run } from "@/lib/types";
import { RunLauncher } from "./run-launcher";
import { RunDetail } from "./run-detail";

export function RunsSection({ projectId }: { projectId: string }) {
  const { getRunsForProject } = useWorkbench();
  const runs = getRunsForProject(projectId);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  if (selectedRun) {
    return (
      <RunDetail
        run={selectedRun}
        projectId={projectId}
        onBack={() => setSelectedRun(null)}
      />
    );
  }

  return (
    <RunLauncher
      projectId={projectId}
      runs={runs}
      onSelectRun={setSelectedRun}
    />
  );
}
