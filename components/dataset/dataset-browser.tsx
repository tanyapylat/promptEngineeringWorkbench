"use client";

import { useState } from "react";
import { Plus, Sparkles, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkbench } from "@/lib/store";
import type { DatasetCase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CaseEditorDialog } from "./case-editor";
import { GenerateDialog } from "./generate-dialog";

export function DatasetBrowser({ projectId }: { projectId: string }) {
  const {
    getDatasetForProject,
    addDatasetCases,
    updateDatasetCase,
    deleteDatasetCase,
    getLatestSpec,
    apiKey,
  } = useWorkbench();

  const cases = getDatasetForProject(projectId);
  const latestSpec = getLatestSpec(projectId);

  const [editingCase, setEditingCase] = useState<DatasetCase | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate(count: number, instructions: string) {
    if (!latestSpec) {
      toast.error("Create a spec first before generating dataset cases.");
      return;
    }
    if (!apiKey?.trim()) {
      toast.error("Please set your OpenAI API key in the sidebar first.");
      return;
    }

    setIsGenerating(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["x-api-key"] = apiKey;

      const res = await fetch("/api/ai/generate-dataset", {
        method: "POST",
        headers,
        body: JSON.stringify({ spec: latestSpec.content, count, instructions }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to generate dataset");
      }

      const data = await res.json();
      const newCases: DatasetCase[] = data.cases.map(
        (c: { input: Record<string, unknown>; expectedOutput?: string }) => ({
          id: crypto.randomUUID(),
          projectId,
          input: c.input,
          expectedOutput: c.expectedOutput,
          labels: [],
          createdFromSpecVersion: latestSpec.version,
          source: "synthetic" as const,
          createdAt: new Date().toISOString(),
        }),
      );

      addDatasetCases(newCases);
      toast.success(`Generated ${newCases.length} cases`);
      setIsGenerateOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSaveCase(data: {
    input: Record<string, unknown>;
    expectedOutput?: string;
    labels: string[];
  }) {
    if (editingCase) {
      updateDatasetCase({ ...editingCase, ...data });
      setEditingCase(null);
      toast.success("Case updated");
    } else {
      const newCase: DatasetCase = {
        id: crypto.randomUUID(),
        projectId,
        input: data.input,
        expectedOutput: data.expectedOutput,
        labels: data.labels,
        createdFromSpecVersion: latestSpec?.version ?? 0,
        source: "manual",
        createdAt: new Date().toISOString(),
      };
      addDatasetCases([newCase]);
      setIsCreateOpen(false);
      toast.success("Case added");
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
                  <TableCell className="max-w-md truncate font-mono text-xs">
                    {JSON.stringify(c.input).slice(0, 100)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {c.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    v{c.createdFromSpecVersion}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.labels.map((l) => (
                        <Badge key={l} variant="outline" className="text-xs">
                          {l}
                        </Badge>
                      ))}
                    </div>
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
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />
    </div>
  );
}
