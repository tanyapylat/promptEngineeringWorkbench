'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useWorkbench } from '@/lib/store';
import type { Run, RunResult, SpecContent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AiLabelingAssistant } from './ai-labeling-assistant';
import { ResultDetailSheet } from './result-detail-sheet';

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
    getPinnedSpec,
    getDraftSpec,
    addSpecVersion,
    updateSpecVersion,
    updateRunResult,
    loadRunDetails,
    isRunDetailsLoading,
    data,
    apiKey,
  } = useWorkbench();

  useEffect(() => {
    loadRunDetails(run.id);
  }, [run.id, loadRunDetails]);

  const [isImproving, setIsImproving] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [editingLabelsResultId, setEditingLabelsResultId] = useState<
    string | null
  >(null);
  const [labelsEditValue, setLabelsEditValue] = useState('');

  function startInlineLabelsEdit(r: RunResult) {
    setEditingLabelsResultId(r.id);
    setLabelsEditValue(r.labels.join(', '));
  }

  function saveInlineLabels() {
    if (editingLabelsResultId === null) return;
    const result = results.find((r) => r.id === editingLabelsResultId);
    if (result) {
      const labels = labelsEditValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      updateRunResult({ ...result, labels });
      toast.success('Labels updated');
    }
    setEditingLabelsResultId(null);
    setLabelsEditValue('');
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
    const pinnedSpec = getPinnedSpec(projectId);
    if (!pinnedSpec) {
      toast.error('No pinned spec found. Please commit a spec version first.');
      return;
    }

    setIsImproving(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers['x-api-key'] = apiKey;

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
            evalName: evals.find((e) => e.id === er.evalId)?.name ?? 'unknown',
            score: er.score,
            reason: er.reason,
          })),
        };
      });

      const res = await apiFetch('/api/ai/improve-spec', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          spec: pinnedSpec.content,
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

      const improvementComment = `Self-improvement based on run results. ${resData.spec.improvement_notes}`;

      // Check if a draft already exists
      const existingDraft = getDraftSpec(projectId);

      if (existingDraft) {
        // Update the existing draft
        await updateSpecVersion({
          ...existingDraft,
          content: improved,
          comment: improvementComment,
        });
        toast.success(
          `Updated draft v${existingDraft.version} with improved spec. Switch to the Specs section to review and commit.`,
        );
      } else {
        // Create a new draft
        await addSpecVersion(projectId, improved, improvementComment);
        toast.success(
          'Improved spec created as a new draft version. Switch to the Specs section to review and commit.',
        );
      }
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsImproving(false);
    }
  }

  async function handleClearAllLabels() {
    const labeledCount = results.filter((r) => r.labels.length > 0).length;

    if (labeledCount === 0) {
      toast.info('No labels to clear.');
      return;
    }

    try {
      for (const r of results) {
        if (r.labels.length > 0) {
          await updateRunResult({ ...r, labels: [] });
        }
      }
      toast.success(`Cleared labels from ${labeledCount} results.`);
    } catch (error) {
      console.error('Failed to clear labels:', error);
      toast.error('Failed to clear labels');
    }
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
          {isImproving ? 'Improving...' : 'Improve Spec from Results'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isRunDetailsLoading && results.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Loading run results...
              </p>
            </div>
          </div>
        ) : (
        <div className="flex flex-col gap-6">
          {/* Aggregated stats */}
          {evalsByDef.size > 0 && (
            <div className="flex flex-wrap gap-3">
              {Array.from(evalsByDef.entries()).map(
                ([evalId, { scores, name, mode }]) => {
                  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                  const display =
                    mode === 'pass_fail'
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

          {/* AI Labeling Assistant */}
          <AiLabelingAssistant
            results={results}
            cases={cases}
            evalResults={evalResults}
            evals={evals}
            runStatus={run.status}
            apiKey={apiKey}
            spec={getPinnedSpec(projectId)?.content ?? null}
            onUpdateResult={updateRunResult}
          />

          {/* Clear All Labels Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllLabels}
                      disabled={
                        results.filter((r) => r.labels.length > 0).length === 0
                      }
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
                <TableHead className="w-24">Source</TableHead>
                <TableHead className="min-w-[120px]">Label</TableHead>
                {activeEvalDefs.map((e) => (
                  <TableHead key={e.id} className="w-24 text-center">
                    <span className="flex items-center justify-center gap-1">
                      {e.name}
                      <Badge
                        variant="secondary"
                        className="px-1 py-0 text-[10px] leading-tight font-mono"
                      >
                        v{e.specVersion}
                      </Badge>
                    </span>
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
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedResultId(r.id)}
                  >
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
                                : 'N/A'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-lg">
                            <pre className="whitespace-pre-wrap text-xs">
                              {caseData
                                ? JSON.stringify(caseData.input, null, 2)
                                : 'N/A'}
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
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] capitalize ${
                          caseData?.source === 'synthetic'
                            ? 'bg-violet-100 text-violet-700'
                            : caseData?.source === 'manual'
                              ? 'bg-sky-100 text-sky-700'
                              : ''
                        }`}
                      >
                        {caseData?.source ?? '—'}
                      </Badge>
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
                            if (e.key === 'Enter') saveInlineLabels();
                            if (e.key === 'Escape') {
                              setEditingLabelsResultId(null);
                              setLabelsEditValue('');
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
                            if (e.key === 'Enter' || e.key === ' ') {
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
                        e.scoreMode === 'pass_fail'
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
                                      ? 'bg-green-50 text-green-700'
                                      : 'bg-red-50 text-red-700'
                                  }`}
                                >
                                  {e.scoreMode === 'pass_fail'
                                    ? er.score === 1
                                      ? 'Pass'
                                      : 'Fail'
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
        )}
      </div>

      <ResultDetailSheet
        resultId={selectedResultId}
        results={results}
        cases={cases}
        evalResults={evalResults}
        activeEvalDefs={activeEvalDefs}
        onClose={() => setSelectedResultId(null)}
        onNavigate={setSelectedResultId}
        onUpdateResult={updateRunResult}
      />
    </div>
  );
}
