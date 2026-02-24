"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Tag,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useWorkbench } from "@/lib/store";
import type { Run, RunResult, SpecContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RunDetailProps {
  run: Run;
  projectId: string;
  onBack: () => void;
}

export function RunDetail({ run, projectId, onBack }: RunDetailProps) {
  const {
    getRunResults,
    getEvalResultsForRun,
    getDatasetForProject,
    getEvalsForProject,
    getLatestSpec,
    addSpecVersion,
    updateRunResult,
    data,
    apiKey,
  } = useWorkbench();

  const [isImproving, setIsImproving] = useState(false);
  const [isLabeling, setIsLabeling] = useState(false);
  const [labelPrompt, setLabelPrompt] = useState("");
  const [labelPanelOpen, setLabelPanelOpen] = useState(false);
  const [editingLabelsResultId, setEditingLabelsResultId] = useState<
    string | null
  >(null);
  const [labelsEditValue, setLabelsEditValue] = useState("");

  function startInlineLabelsEdit(r: RunResult) {
    setEditingLabelsResultId(r.id);
    setLabelsEditValue(r.labels.join(", "));
  }

  function saveInlineLabels() {
    if (editingLabelsResultId === null) return;
    const result = results.find((r) => r.id === editingLabelsResultId);
    if (result) {
      const labels = labelsEditValue
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      updateRunResult({ ...result, labels });
      toast.success("Labels updated");
    }
    setEditingLabelsResultId(null);
    setLabelsEditValue("");
  }

  const results = getRunResults(run.id);
  const evalResults = getEvalResultsForRun(run.id);
  const cases = getDatasetForProject(projectId);
  const evals = getEvalsForProject(projectId);
  const prompt = data.prompts.find((p) => p.id === run.promptId);

  // Aggregate stats
  const evalsByDef = new Map<
    string,
    { scores: number[]; name: string; mode: string }
  >();
  for (const er of evalResults) {
    const evalDef = evals.find((e) => e.id === er.evalId);
    if (!evalDef) continue;
    if (!evalsByDef.has(er.evalId)) {
      evalsByDef.set(er.evalId, {
        scores: [],
        name: evalDef.name,
        mode: evalDef.scoreMode,
      });
    }
    evalsByDef.get(er.evalId)!.scores.push(er.score);
  }

  const activeEvalDefs = evals.filter((e) => run.evalIds.includes(e.id));

  async function handleImproveSpec() {
    const latestSpec = getLatestSpec(projectId);
    if (!latestSpec) {
      toast.error("No spec found to improve.");
      return;
    }

    setIsImproving(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["x-api-key"] = apiKey;

      const resultsData = results.map((r) => {
        const caseData = cases.find((c) => c.id === r.datasetCaseId);
        const caseEvalResults = evalResults.filter(
          (er) => er.runResultId === r.id,
        );
        return {
          input: caseData?.input,
          output: r.output,
          labels: r.labels,
          evalScores: caseEvalResults.map((er) => ({
            evalName: evals.find((e) => e.id === er.evalId)?.name ?? "unknown",
            score: er.score,
            reason: er.reason,
          })),
        };
      });

      const res = await apiFetch("/api/ai/improve-spec", {
        method: "POST",
        headers,
        body: JSON.stringify({
          spec: latestSpec.content,
          results: resultsData,
        }),
      });

      const resData = await res.json();
      const improved: SpecContent = {
        task_description: resData.spec.task_description,
        input_description: resData.spec.input_description,
        output_description: resData.spec.output_description,
        constraints: resData.spec.constraints,
        examples: resData.spec.examples,
      };

      addSpecVersion(
        projectId,
        improved,
        `Improved from run results. Notes: ${resData.spec.improvement_notes}`,
      );
      toast.success(
        "Improved spec created as a new version. Switch to the Specs section to review.",
      );
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsImproving(false);
    }
  }

  async function handleLabelResults() {
    if (!labelPrompt.trim()) {
      toast.error("Please enter a labeling prompt.");
      return;
    }

    setIsLabeling(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["x-api-key"] = apiKey;

      const resultsData = results.map((r) => {
        const caseData = cases.find((c) => c.id === r.datasetCaseId);
        const caseEvalResults = evalResults.filter(
          (er) => er.runResultId === r.id,
        );
        return {
          id: r.id,
          input: caseData?.input,
          output: r.output,
          evalScores: caseEvalResults.map((er) => ({
            evalName: evals.find((e) => e.id === er.evalId)?.name ?? "unknown",
            score: er.score,
            reason: er.reason,
          })),
        };
      });

      const res = await apiFetch("/api/ai/label-results", {
        method: "POST",
        headers,
        body: JSON.stringify({
          labelPrompt: labelPrompt.trim(),
          results: resultsData,
        }),
      });

      const { labeledResults } = await res.json();

      if (Array.isArray(labeledResults)) {
        let labeledCount = 0;
        for (const lr of labeledResults) {
          // Skip results with no labels (they didn't match the criteria)
          if (!lr.labels || lr.labels.length === 0) {
            continue;
          }
          
          const existingResult = results.find((r) => r.id === lr.resultId);
          if (existingResult) {
            const mergedLabels = Array.from(
              new Set([...existingResult.labels, ...lr.labels]),
            );
            updateRunResult({ ...existingResult, labels: mergedLabels });
            labeledCount++;
          }
        }
        
        if (labeledCount > 0) {
          toast.success(`Labeled ${labeledCount} results successfully.`);
        } else {
          toast.info("No results matched the labeling criteria.");
        }
      }
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsLabeling(false);
    }
  }

  function handleClearAllLabels() {
    const labeledCount = results.filter((r) => r.labels.length > 0).length;
    
    if (labeledCount === 0) {
      toast.info("No labels to clear.");
      return;
    }

    results.forEach((r) => {
      if (r.labels.length > 0) {
        updateRunResult({ ...r, labels: [] });
      }
    });

    toast.success(`Cleared labels from ${labeledCount} results.`);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Run Results
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">
                {run.status}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                spec v{run.specVersion}
              </span>
              {prompt && (
                <span className="text-xs text-muted-foreground">
                  {prompt.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(run.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleImproveSpec}
          disabled={isImproving || results.length === 0}
        >
          {isImproving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isImproving ? "Improving..." : "Improve Spec from Results"}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6">
          {/* Aggregated stats */}
          {evalsByDef.size > 0 && (
            <div className="flex flex-wrap gap-3">
              {Array.from(evalsByDef.entries()).map(
                ([evalId, { scores, name, mode }]) => {
                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                  const display =
                    mode === "pass_fail"
                      ? `${Math.round(avg * 100)}% pass`
                      : `${avg.toFixed(1)} / 5`;

                  return (
                    <Card key={evalId} className="min-w-[140px]">
                      <CardContent className="py-3">
                        <p className="text-xs text-muted-foreground">{name}</p>
                        <p className="text-xl font-semibold text-foreground">
                          {display}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {scores.length} scored
                        </p>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>
          )}

          {/* AI Labeling Panel */}
          <Collapsible open={labelPanelOpen} onOpenChange={setLabelPanelOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    textAlign: "left",
                    transition: "background-color 0.2s",
                    borderRadius: "0.5rem",
                  }}
                  className="hover:bg-accent/50"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Tag style={{ height: "1rem", width: "1rem" }} className="text-muted-foreground" />
                    <span style={{ fontSize: "0.875rem", fontWeight: 500 }} className="text-foreground">
                      AI Labeling Assistant
                    </span>
                    {results.some((r) => r.labels.length > 0) && (
                      <Badge variant="secondary" style={{ fontSize: "0.75rem" }}>
                        {results.filter((r) => r.labels.length > 0).length} labeled
                      </Badge>
                    )}
                  </div>
                  {labelPanelOpen ? (
                    <ChevronUp style={{ height: "1rem", width: "1rem" }} className="text-muted-foreground" />
                  ) : (
                    <ChevronDown style={{ height: "1rem", width: "1rem" }} className="text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent style={{ paddingTop: 0, paddingBottom: "1rem", paddingLeft: "1rem", paddingRight: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <Textarea
                      placeholder='e.g., "Explain why each response failed" or "Group outputs by common error type" or "Tag results that violate formatting constraints"'
                      value={labelPrompt}
                      onChange={(e) => setLabelPrompt(e.target.value)}
                      rows={2}
                      style={{ resize: "none", fontSize: "0.875rem" }}
                      disabled={isLabeling}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: "0.75rem" }} className="text-muted-foreground">
                        The AI will analyze all {results.length} results and apply labels based on your prompt.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleLabelResults}
                        disabled={isLabeling || results.length === 0 || !labelPrompt.trim()}
                      >
                        {isLabeling ? (
                          <Loader2 style={{ marginRight: "0.5rem", height: "0.875rem", width: "0.875rem" }} className="animate-spin" />
                        ) : (
                          <Tag style={{ marginRight: "0.5rem", height: "0.875rem", width: "0.875rem" }} />
                        )}
                        {isLabeling ? "Labeling..." : "Label All Results"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Clear All Labels Button */}
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllLabels}
                      disabled={results.filter((r) => r.labels.length > 0).length === 0}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Clear All Labels
                    </Button>
                  </span>
                </TooltipTrigger>
                {results.filter((r) => r.labels.length > 0).length === 0 && (
                  <TooltipContent>
                    <p className="text-xs">No labels to clear</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Results table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Input</TableHead>
                <TableHead>Output</TableHead>
                <TableHead className="min-w-[120px]">Label</TableHead>
                {activeEvalDefs.map((e) => (
                  <TableHead key={e.id} className="w-24 text-center">
                    {e.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => {
                const caseData = cases.find((c) => c.id === r.datasetCaseId);
                const caseEvals = evalResults.filter(
                  (er) => er.runResultId === r.id,
                );

                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate font-mono text-xs">
                              {caseData
                                ? JSON.stringify(caseData.input).slice(0, 80)
                                : "N/A"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-lg">
                            <pre className="whitespace-pre-wrap text-xs">
                              {caseData
                                ? JSON.stringify(caseData.input, null, 2)
                                : "N/A"}
                            </pre>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate font-mono text-xs">
                              {r.output.slice(0, 120)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-lg">
                            <pre className="whitespace-pre-wrap text-xs">
                              {r.output}
                            </pre>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell
                      className="min-w-[120px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editingLabelsResultId === r.id ? (
                        <Input
                          value={labelsEditValue}
                          onChange={(e) => setLabelsEditValue(e.target.value)}
                          onBlur={saveInlineLabels}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveInlineLabels();
                            if (e.key === "Escape") {
                              setEditingLabelsResultId(null);
                              setLabelsEditValue("");
                            }
                          }}
                          placeholder="label1, label2"
                          className="h-8 text-xs"
                          style={{ minWidth: 120 }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="flex min-h-8 flex-wrap items-center gap-1 rounded border border-transparent px-2 py-1 hover:border-input"
                          onClick={() => startInlineLabelsEdit(r)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              startInlineLabelsEdit(r);
                            }
                          }}
                          aria-label="Edit labels"
                        >
                          {r.labels.length > 0 ? (
                            r.labels.map((l) => (
                              <Badge
                                key={l}
                                variant="outline"
                                className="text-xs"
                              >
                                {l}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Click to add labels
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    {activeEvalDefs.map((e) => {
                      const er = caseEvals.find((ce) => ce.evalId === e.id);
                      if (!er) {
                        return (
                          <TableCell
                            key={e.id}
                            className="text-center text-xs text-muted-foreground"
                          >
                            --
                          </TableCell>
                        );
                      }
                      const isGood =
                        e.scoreMode === "pass_fail"
                          ? er.score === 1
                          : er.score >= 4;

                      return (
                        <TableCell key={e.id} className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    isGood
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {e.scoreMode === "pass_fail"
                                    ? er.score === 1
                                      ? "Pass"
                                      : "Fail"
                                    : `${er.score}/5`}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-sm"
                              >
                                <p className="text-xs">{er.reason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
