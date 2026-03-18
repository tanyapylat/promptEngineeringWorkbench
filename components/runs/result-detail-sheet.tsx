'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { RunResult, DatasetCase, EvalResult, EvalDefinition } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface ResultDetailSheetProps {
  resultId: string | null;
  results: RunResult[];
  cases: DatasetCase[];
  evalResults: EvalResult[];
  activeEvalDefs: EvalDefinition[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  onUpdateResult: (result: RunResult) => void;
}

export function ResultDetailSheet({
  resultId,
  results,
  cases,
  evalResults,
  activeEvalDefs,
  onClose,
  onNavigate,
  onUpdateResult,
}: ResultDetailSheetProps) {
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [labelsDraft, setLabelsDraft] = useState('');

  const resultIndex = results.findIndex((r) => r.id === resultId);
  const result = resultIndex >= 0 ? results[resultIndex] : null;
  const caseData = result
    ? cases.find((c) => c.id === result.datasetCaseId)
    : null;
  const caseEvals = result
    ? evalResults.filter((er) => er.runResultId === result.id)
    : [];

  function startEditLabels() {
    if (!result) return;
    setLabelsDraft(result.labels.join(', '));
    setIsEditingLabels(true);
  }

  function saveLabels() {
    if (!result) return;
    const labels = labelsDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onUpdateResult({ ...result, labels });
    setIsEditingLabels(false);
    toast.success('Labels updated');
  }

  const hasPrev = resultIndex > 0;
  const hasNext = resultIndex >= 0 && resultIndex < results.length - 1;

  useEffect(() => {
    if (!resultId) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (hasPrev) {
          e.preventDefault();
          onNavigate(results[resultIndex - 1].id);
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (hasNext) {
          e.preventDefault();
          onNavigate(results[resultIndex + 1].id);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resultId, resultIndex, hasPrev, hasNext, results, onNavigate]);

  return (
    <Sheet open={!!resultId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="sm:max-w-[720px] w-full flex flex-col overflow-hidden"
      >
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>
              Result #{resultIndex + 1} of {results.length}
            </SheetTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!hasPrev}
                onClick={() => hasPrev && onNavigate(results[resultIndex - 1].id)}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!hasNext}
                onClick={() => hasNext && onNavigate(results[resultIndex + 1].id)}
              >
                <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
              </Button>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Detailed view of run result
          </SheetDescription>
        </SheetHeader>

        {result && (
          <div className="flex-1 overflow-y-auto space-y-5 px-4 pb-6">
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Input
              </h4>
              <pre className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-[240px] overflow-y-auto">
                {caseData
                  ? JSON.stringify(caseData.input, null, 2)
                  : 'N/A'}
              </pre>
            </section>

            {caseData?.source && (
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Source
                </h4>
                <Badge
                  variant="secondary"
                  className={`capitalize ${
                    caseData.source === 'synthetic'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {caseData.source}
                </Badge>
              </section>
            )}

            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Output
              </h4>
              <pre className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
                {result.output}
              </pre>
            </section>

            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Labels
              </h4>
              {isEditingLabels ? (
                <div className="flex gap-2">
                  <Input
                    value={labelsDraft}
                    onChange={(e) => setLabelsDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveLabels();
                      if (e.key === 'Escape') setIsEditingLabels(false);
                    }}
                    placeholder="label1, label2, ..."
                    className="h-8 text-xs flex-1"
                    autoFocus
                  />
                  <Button size="sm" className="h-8" onClick={saveLabels}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setIsEditingLabels(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div
                  className="flex min-h-8 flex-wrap items-center gap-1.5 rounded-md border border-dashed border-input px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={startEditLabels}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      startEditLabels();
                    }
                  }}
                >
                  {result.labels.length > 0 ? (
                    result.labels.map((l) => (
                      <Badge key={l} variant="outline">
                        {l}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Click to add labels...
                    </span>
                  )}
                </div>
              )}
            </section>

            {caseEvals.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Evaluations
                </h4>
                <div className="space-y-3">
                  {caseEvals.map((er) => {
                    const evalDef = activeEvalDefs.find(
                      (e) => e.id === er.evalId,
                    );
                    if (!evalDef) return null;
                    const isGood =
                      evalDef.scoreMode === 'pass_fail'
                        ? er.score === 1
                        : er.score >= 4;
                    const scoreLabel =
                      evalDef.scoreMode === 'pass_fail'
                        ? er.score === 1
                          ? 'Pass'
                          : 'Fail'
                        : `${er.score}/5`;

                    return (
                      <div
                        key={er.id}
                        className="rounded-md border p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {evalDef.name}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              isGood
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {scoreLabel}
                          </span>
                        </div>
                        {er.reason && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {er.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {caseData?.expectedOutput && (
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Expected Output
                </h4>
                <pre className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
                  {caseData.expectedOutput}
                </pre>
              </section>
            )}

            <section>
              <p className="text-xs text-muted-foreground">
                Created {new Date(result.createdAt).toLocaleString()}
              </p>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
