"use client";

import { useState } from "react";
import { Plus, Sparkles, Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useWorkbench } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type { EvalDefinition } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EvalEditorDialog } from "./eval-editor";

export function EvalManager({ projectId }: { projectId: string }) {
  const {
    getEvalsForProject,
    addEvalDefinition,
    updateEvalDefinition,
    deleteEvalDefinition,
    getLatestSpec,
    apiKey,
  } = useWorkbench();

  const evals = getEvalsForProject(projectId);
  const latestSpec = getLatestSpec(projectId);

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingEval, setEditingEval] = useState<EvalDefinition | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function handleGenerate() {
    if (!latestSpec) {
      toast.error("Create a spec first before generating evals.");
      return;
    }

    setIsGenerating(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["x-api-key"] = apiKey;

      const res = await apiFetch("/api/ai/generate-evals", {
        method: "POST",
        headers,
        body: JSON.stringify({ spec: latestSpec.content }),
      });

      const data = await res.json();
      const newEvals: EvalDefinition[] = data.evals.map(
        (e: {
          name: string;
          description: string;
          scoreMode: string;
          judgeInstruction: string;
        }) => ({
          id: crypto.randomUUID(),
          projectId,
          specVersion: latestSpec.version,
          name: e.name,
          description: e.description,
          scoreMode: e.scoreMode === "scale_1_5" ? "scale_1_5" : "pass_fail",
          judgeInstruction: e.judgeInstruction,
          createdAt: new Date().toISOString(),
        }),
      );

      newEvals.forEach((e) => addEvalDefinition(e));
      toast.success(`Generated ${newEvals.length} evals`);
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSaveEval(data: {
    name: string;
    description: string;
    scoreMode: "pass_fail" | "scale_1_5";
    judgeInstruction: string;
  }) {
    if (editingEval) {
      updateEvalDefinition({ ...editingEval, ...data });
      setEditingEval(null);
      toast.success("Eval updated");
    } else {
      const newEval: EvalDefinition = {
        id: crypto.randomUUID(),
        projectId,
        specVersion: latestSpec?.version ?? 0,
        ...data,
        createdAt: new Date().toISOString(),
      };
      addEvalDefinition(newEval);
      setIsCreateOpen(false);
      toast.success("Eval created");
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Evals</h2>
          <p className="text-sm text-muted-foreground">
            {evals.length} eval definition{evals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Generate from Spec"}
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Eval
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {evals.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No evals yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate evaluation criteria from your spec or create them
                manually.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {evals.map((e) => (
              <Card key={e.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      {e.name}
                    </CardTitle>
                    <Badge
                      variant={
                        e.scoreMode === "pass_fail" ? "secondary" : "outline"
                      }
                      className="text-xs"
                    >
                      {e.scoreMode === "pass_fail" ? "Pass/Fail" : "1-5 Scale"}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-mono">
                      spec v{e.specVersion}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingEval(e)}
                      aria-label="Edit eval"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        deleteEvalDefinition(e.id);
                        toast.success("Eval deleted");
                      }}
                      aria-label="Delete eval"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {e.description}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Judge instruction
                    </summary>
                    <p className="mt-1 rounded-md border border-border bg-secondary/50 p-2 font-mono text-xs">
                      {e.judgeInstruction}
                    </p>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EvalEditorDialog
        open={!!editingEval || isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEval(null);
            setIsCreateOpen(false);
          }
        }}
        initialData={
          editingEval
            ? {
                name: editingEval.name,
                description: editingEval.description,
                scoreMode: editingEval.scoreMode,
                judgeInstruction: editingEval.judgeInstruction,
              }
            : undefined
        }
        onSave={handleSaveEval}
      />
    </div>
  );
}
