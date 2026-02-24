"use client";

import { useState } from "react";
import { Plus, Sparkles, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useWorkbench } from "@/lib/store";
import type { DatasetCase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { CaseEditorDialog } from "./case-editor";
import { GenerateDialog } from "./generate-dialog";

export function DatasetBrowser({ projectId }: { projectId: string }) {
  const {
    getDatasetForProject,
    addDatasetCases,
    updateDatasetCase,
    deleteDatasetCase,
    getPinnedSpec,
    apiKey,
  } = useWorkbench();

  const cases = getDatasetForProject(projectId);
  const pinnedSpec = getPinnedSpec(projectId);

  const [editingCase, setEditingCase] = useState<DatasetCase | null>(null);
  const [editingLabelsCaseId, setEditingLabelsCaseId] = useState<string | null>(
    null,
  );
  const [labelsEditValue, setLabelsEditValue] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  function startInlineLabelsEdit(c: DatasetCase) {
    setEditingLabelsCaseId(c.id);
    setLabelsEditValue(c.labels.join(", "));
  }

  async function saveInlineLabels() {
    if (editingLabelsCaseId === null) return;
    const next = cases.find((x) => x.id === editingLabelsCaseId);
    if (!next) return;
    const labels = labelsEditValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await updateDatasetCase({ ...next, labels });
      setEditingLabelsCaseId(null);
      setLabelsEditValue("");
      toast.success("Labels updated");
    } catch (error) {
      console.error("Failed to update labels:", error);
      toast.error("Failed to update labels");
    }
  }

  async function handleGenerate(
    count: number,
    instructions: string,
    datasetLabels: string[],
  ) {
    const pinnedSpec = getPinnedSpec(projectId);
    
    if (!pinnedSpec) {
      toast.error("Please commit and pin a spec version first before generating dataset cases.");
      return;
    }

    if (pinnedSpec.status !== "committed") {
      toast.error("Only committed spec versions can be used to generate dataset. Please commit the draft first.");
      return;
    }

    setIsGenerating(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["x-api-key"] = apiKey;

      const res = await apiFetch("/api/ai/generate-dataset", {
        method: "POST",
        headers,
        body: JSON.stringify({
          spec: pinnedSpec.content,
          count,
          instructions,
          datasetLabels: datasetLabels.length ? datasetLabels : undefined,
        }),
      });

      const data = await res.json();
      const newCases: DatasetCase[] = data.cases.map(
        (c: { input: Record<string, unknown>; expectedOutput?: string }) => ({
          id: crypto.randomUUID(),
          projectId,
          input: c.input,
          expectedOutput: c.expectedOutput,
          labels: [],
          createdFromSpecVersion: pinnedSpec.version,
          source: "synthetic" as const,
          createdAt: new Date().toISOString(),
        }),
      );

      await addDatasetCases(newCases);
      toast.success(`Generated ${newCases.length} cases`);
      setIsGenerateOpen(false);
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveCase(data: {
    input: Record<string, unknown>;
    expectedOutput?: string;
    labels: string[];
  }) {
    try {
      if (editingCase) {
        await updateDatasetCase({ ...editingCase, ...data });
        setEditingCase(null);
        toast.success("Case updated");
      } else {
        const newCase: DatasetCase = {
          id: crypto.randomUUID(),
          projectId,
          input: data.input,
          expectedOutput: data.expectedOutput,
          labels: data.labels,
          createdFromSpecVersion: pinnedSpec?.version ?? 0,
          source: "manual",
          createdAt: new Date().toISOString(),
        };
        await addDatasetCases([newCase]);
        setIsCreateOpen(false);
        toast.success("Case added");
      }
    } catch (error) {
      console.error("Failed to save case:", error);
      toast.error("Failed to save case");
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dataset</h2>
          <p className="text-sm text-muted-foreground">
            {cases.length} case{cases.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGenerateOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Cases
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Case
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {cases.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                No dataset cases yet.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate synthetic cases from your spec or add them manually.
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Input Preview</TableHead>
                <TableHead className="w-32">Source</TableHead>
                <TableHead className="w-24">Spec v.</TableHead>
                <TableHead>Labels</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c, i) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setEditingCase(c)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate font-mono text-xs">
                            {JSON.stringify(c.input).slice(0, 100)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-lg">
                          <pre className="whitespace-pre-wrap text-xs">
                            {JSON.stringify(c.input, null, 2)}
                          </pre>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {c.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    v{c.createdFromSpecVersion}
                  </TableCell>
                  <TableCell
                    className="min-w-[120px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingLabelsCaseId === c.id ? (
                      <Input
                        value={labelsEditValue}
                        onChange={(e) => setLabelsEditValue(e.target.value)}
                        onBlur={saveInlineLabels}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveInlineLabels();
                          if (e.key === "Escape") {
                            setEditingLabelsCaseId(null);
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
                        onClick={() => startInlineLabelsEdit(c)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            startInlineLabelsEdit(c);
                          }
                        }}
                        aria-label="Edit labels"
                      >
                        {c.labels.length > 0 ? (
                          c.labels.map((l) => (
                            <Badge key={l} variant="outline" className="text-xs">
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
                  <TableCell>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDatasetCase(c.id);
                        toast.success("Case deleted");
                      }}
                      aria-label="Delete case"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit dialog */}
      <CaseEditorDialog
        open={!!editingCase || isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCase(null);
            setIsCreateOpen(false);
          }
        }}
        initialData={
          editingCase
            ? {
                input: editingCase.input,
                expectedOutput: editingCase.expectedOutput,
                labels: editingCase.labels,
              }
            : undefined
        }
        onSave={handleSaveCase}
      />

      {/* Generate dialog */}
      <GenerateDialog
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onGenerate={(count, instructions) =>
          handleGenerate(
            count,
            instructions,
            Array.from(
              new Set(cases.flatMap((c) => c.labels).filter(Boolean)),
            ) as string[],
          )
        }
        isGenerating={isGenerating}
      />
    </div>
  );
}
