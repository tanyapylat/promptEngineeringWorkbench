"use client";

import { useState } from "react";
import { Play, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useWorkbench } from "@/lib/store";
import type { Run, RunResult, EvalResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface RunLauncherProps {
  projectId: string;
  runs: Run[];
  onSelectRun: (run: Run) => void;
}

export function RunLauncher({
  projectId,
  runs,
  onSelectRun,
}: RunLauncherProps) {
  const {
    getPromptsForProject,
    getDatasetForProject,
    getEvalsForProject,
    getLatestSpec,
    addRun,
    updateRun,
    addRunResults,
    addEvalResults,
    apiKey,
  } = useWorkbench();

  const prompts = getPromptsForProject(projectId);
  const cases = getDatasetForProject(projectId);
  const evals = getEvalsForProject(projectId);
  const latestSpec = getLatestSpec(projectId);

  const [selectedPromptId, setSelectedPromptId] = useState<string>("");
  const [selectedEvalIds, setSelectedEvalIds] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  function toggleEval(evalId: string) {
    setSelectedEvalIds((prev) =>
      prev.includes(evalId)
        ? prev.filter((id) => id !== evalId)
        : [...prev, evalId],
    );
  }

  async function handleRun() {
    if (!selectedPromptId || cases.length === 0) {
      toast.error("Select a prompt and ensure you have dataset cases.");
      return;
    }

    const prompt = prompts.find((p) => p.id === selectedPromptId);
    if (!prompt) return;

    setIsRunning(true);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["x-api-key"] = apiKey;

    const run: Run = {
      id: crypto.randomUUID(),
      projectId,
      promptId: selectedPromptId,
      datasetCaseIds: cases.map((c) => c.id),
      evalIds: selectedEvalIds,
      specVersion: latestSpec?.version ?? 0,
      status: "running",
      createdAt: new Date().toISOString(),
    };
    addRun(run);

    try {
      // Run prompt on each case
      const results: RunResult[] = [];
      for (const c of cases) {
        const res = await apiFetch("/api/ai/run-prompt", {
          method: "POST",
          headers,
          body: JSON.stringify({
            systemPrompt: prompt.content,
            input: c.input,
          }),
        });

        const data = await res.json();
        results.push({
          id: crypto.randomUUID(),
          runId: run.id,
          datasetCaseId: c.id,
          output: data.output,
          labels: [],
          createdAt: new Date().toISOString(),
        });
      }
      addRunResults(results);

      // Run evals on results
      if (selectedEvalIds.length > 0) {
        const evalDefs = evals.filter((e) => selectedEvalIds.includes(e.id));
        const evalResults: EvalResult[] = [];

        for (const result of results) {
          const caseData = cases.find((c) => c.id === result.datasetCaseId);
          for (const evalDef of evalDefs) {
            const res = await fetch("/api/ai/run-eval", {
              method: "POST",
              headers,
              body: JSON.stringify({
                evalDefinition: evalDef,
                input: caseData?.input,
                expectedOutput: caseData?.expectedOutput,
                actualOutput: result.output,
              }),
            });

            if (!res.ok) continue;

            const data = await res.json();
            evalResults.push({
              id: crypto.randomUUID(),
              runResultId: result.id,
              evalId: evalDef.id,
              score: data.score,
              reason: data.reason,
              createdAt: new Date().toISOString(),
            });
          }
        }
        addEvalResults(evalResults);
      }

      updateRun({ ...run, status: "completed" });
      toast.success(`Run completed: ${results.length} cases processed`);
    } catch {
      updateRun({ ...run, status: "failed" });
      // apiFetch already shows toast
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Runs</h2>
          <p className="text-sm text-muted-foreground">
            Execute prompts against your dataset
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Launch section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Launch a Run
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Prompt</label>
                <Select
                  value={selectedPromptId}
                  onValueChange={setSelectedPromptId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a prompt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (spec v{p.specVersion})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Dataset: {cases.length} case{cases.length !== 1 ? "s" : ""}
                </label>
                <p className="text-xs text-muted-foreground">
                  All cases in the dataset will be used. Filter support coming
                  soon.
                </p>
              </div>

              {evals.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Evals to run
                  </label>
                  <div className="flex flex-col gap-2">
                    {evals.map((e) => (
                      <label
                        key={e.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={selectedEvalIds.includes(e.id)}
                          onCheckedChange={() => toggleEval(e.id)}
                        />
                        <span>{e.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {e.scoreMode === "pass_fail" ? "Pass/Fail" : "1-5"}
                        </Badge>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleRun}
                disabled={isRunning || !selectedPromptId || cases.length === 0}
                className="self-start"
              >
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {isRunning ? "Running..." : "Launch Run"}
              </Button>
            </CardContent>
          </Card>

          {/* Run history */}
          {runs.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Run History
              </h3>
              <div className="flex flex-col gap-2">
                {runs.map((r) => (
                  <Card
                    key={r.id}
                    className="cursor-pointer transition-colors hover:bg-secondary/30"
                    onClick={() => onSelectRun(r)}
                  >
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Run on {new Date(r.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.datasetCaseIds.length} cases, spec v
                            {r.specVersion}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          r.status === "completed"
                            ? "secondary"
                            : r.status === "running"
                              ? "outline"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {r.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
