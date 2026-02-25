'use client';

import { useState } from 'react';
import { Tag, Loader2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import type {
  RunResult,
  DatasetCase,
  EvalResult,
  EvalDefinition,
  SpecContent,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AiLabelingAssistantProps {
  results: RunResult[];
  cases: DatasetCase[];
  evalResults: EvalResult[];
  evals: EvalDefinition[];
  runStatus: string;
  apiKey?: string;
  spec?: SpecContent | null;
  onUpdateResult: (result: RunResult) => void;
}

export function AiLabelingAssistant({
  results,
  cases,
  evalResults,
  evals,
  runStatus,
  apiKey,
  spec,
  onUpdateResult,
}: AiLabelingAssistantProps) {
  const [isLabeling, setIsLabeling] = useState(false);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [labelPrompt, setLabelPrompt] = useState('');
  const [labelPanelOpen, setLabelPanelOpen] = useState(false);

  async function handleGeneratePersona() {
    if (!spec) return;
    setIsGeneratingPersona(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers['x-api-key'] = apiKey;

      const res = await apiFetch('/api/ai/generate-persona', {
        method: 'POST',
        headers,
        body: JSON.stringify({ spec }),
      });

      const { persona } = await res.json();
      if (persona) {
        setLabelPrompt(persona);
        toast.success('Persona generated — review and run labeling.');
      }
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsGeneratingPersona(false);
    }
  }

  async function handleLabelResults() {
    if (!labelPrompt.trim()) {
      toast.error('Please enter a labeling prompt.');
      return;
    }

    setIsLabeling(true);
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
          id: r.id,
          input: caseData?.input,
          output: r.output,
          evalScores: caseEvalResults.map((er) => ({
            evalName: evals.find((e) => e.id === er.evalId)?.name ?? 'unknown',
            score: er.score,
            reason: er.reason,
          })),
        };
      });

      const res = await apiFetch('/api/ai/label-results', {
        method: 'POST',
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
          if (!lr.labels || lr.labels.length === 0) {
            continue;
          }

          const existingResult = results.find((r) => r.id === lr.resultId);
          if (existingResult) {
            const mergedLabels = Array.from(
              new Set([...existingResult.labels, ...lr.labels]),
            );
            onUpdateResult({ ...existingResult, labels: mergedLabels });
            labeledCount++;
          }
        }

        if (labeledCount > 0) {
          toast.success(`Labeled ${labeledCount} results successfully.`);
        } else {
          toast.info('No improvement opportunities spotted.');
        }
      }
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsLabeling(false);
    }
  }

  const labeledCount = results.filter((r) => r.labels.length > 0).length;

  // Disable labeling only if this specific run has no results yet
  // (regardless of the run status - if results exist, the run is complete enough to label)
  const canLabel = results.length > 0;

  return (
    <Collapsible open={labelPanelOpen} onOpenChange={setLabelPanelOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              textAlign: 'left',
              transition: 'background-color 0.2s',
              borderRadius: '0.5rem',
            }}
            className="hover:bg-accent/50"
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Tag
                style={{ height: '1rem', width: '1rem' }}
                className="text-muted-foreground"
              />
              <span
                style={{ fontSize: '0.875rem', fontWeight: 500 }}
                className="text-foreground"
              >
                AI Labeling Assistant
              </span>
              {labeledCount > 0 && (
                <Badge variant="secondary" style={{ fontSize: '0.75rem' }}>
                  {labeledCount} labeled
                </Badge>
              )}
            </div>
            {labelPanelOpen ? (
              <ChevronUp
                style={{ height: '1rem', width: '1rem' }}
                className="text-muted-foreground"
              />
            ) : (
              <ChevronDown
                style={{ height: '1rem', width: '1rem' }}
                className="text-muted-foreground"
              />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent
            style={{
              paddingTop: 0,
              paddingBottom: '1rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <p
                  style={{ fontSize: '0.75rem' }}
                  className="text-muted-foreground"
                >
                  Describe an analysis angle or expert perspective to spot
                  improvement opportunities across all results. Use "Generate
                  Persona" to auto-create one from the current spec.
                </p>
                <Textarea
                  placeholder='e.g., "As a senior UX writer I want outputs to be concise and action-oriented" or "From a legal compliance perspective, outputs must avoid unqualified claims"'
                  value={labelPrompt}
                  onChange={(e) => setLabelPrompt(e.target.value)}
                  rows={3}
                  style={{ resize: 'none', fontSize: '0.875rem' }}
                  disabled={isLabeling || isGeneratingPersona || !canLabel}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <p
                  style={{ fontSize: '0.75rem' }}
                  className="text-muted-foreground"
                >
                  {!canLabel
                    ? 'No results yet — labeling will be available once results are generated.'
                    : `The AI will analyze all ${results.length} results and spot improvement opportunities.`}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {spec && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGeneratePersona}
                            disabled={isGeneratingPersona || isLabeling}
                          >
                            {isGeneratingPersona ? (
                              <Loader2
                                style={{
                                  marginRight: '0.5rem',
                                  height: '0.875rem',
                                  width: '0.875rem',
                                }}
                                className="animate-spin"
                              />
                            ) : (
                              <Wand2
                                style={{
                                  marginRight: '0.5rem',
                                  height: '0.875rem',
                                  width: '0.875rem',
                                }}
                              />
                            )}
                            {isGeneratingPersona
                              ? 'Generating...'
                              : 'Generate Persona'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Auto-generate a synthetic expert persona from the
                            current spec
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm"
                            onClick={handleLabelResults}
                            disabled={
                              isLabeling ||
                              isGeneratingPersona ||
                              !canLabel ||
                              !labelPrompt.trim()
                            }
                          >
                            {isLabeling ? (
                              <Loader2
                                style={{
                                  marginRight: '0.5rem',
                                  height: '0.875rem',
                                  width: '0.875rem',
                                }}
                                className="animate-spin"
                              />
                            ) : (
                              <Tag
                                style={{
                                  marginRight: '0.5rem',
                                  height: '0.875rem',
                                  width: '0.875rem',
                                }}
                              />
                            )}
                            {isLabeling ? 'Labeling...' : 'Label All Results'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canLabel && (
                        <TooltipContent>
                          <p className="text-xs">
                            No results available to label yet
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
