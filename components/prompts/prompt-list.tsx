"use client";

import { useState } from "react";
import { Sparkles, Loader2, Trash2, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useWorkbench } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type { Prompt } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptViewer } from "./prompt-viewer";

export function PromptList({ projectId }: { projectId: string }) {
  const {
    getPromptsForProject,
    addPrompt,
    updatePrompt,
    deletePrompt,
    getPinnedSpec,
    apiKey,
  } = useWorkbench();

  const prompts = getPromptsForProject(projectId);
  const pinnedSpec = getPinnedSpec(projectId);

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  async function handleGenerate() {
    // Get the pinned spec (must be committed)
    const pinnedSpec = getPinnedSpec(projectId);
    
    if (!pinnedSpec) {
      toast.error("Please commit and pin a spec version first before generating a prompt.");
      return;
    }

    if (pinnedSpec.status !== "committed") {
      toast.error("Only committed spec versions can be used to generate prompts. Please commit the draft first.");
      return;
    }

    setIsGenerating(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["x-api-key"] = apiKey;

      const res = await apiFetch("/api/ai/generate-prompt", {
        method: "POST",
        headers,
        body: JSON.stringify({ spec: pinnedSpec.content }),
      });

      const data = await res.json();
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        projectId,
        specVersion: pinnedSpec.version,
        name: `Prompt v${prompts.length + 1}`,
        content: data.prompt,
        createdAt: new Date().toISOString(),
      };
      await addPrompt(newPrompt);
      setSelectedPrompt(newPrompt);
      toast.success("Prompt generated");
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsGenerating(false);
    }
  }

  if (selectedPrompt) {
    return (
      <PromptViewer
        prompt={selectedPrompt}
        onBack={() => setSelectedPrompt(null)}
        onUpdate={async (updated) => {
          await updatePrompt(updated);
          setSelectedPrompt(updated);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Prompts</h2>
          <p className="text-sm text-muted-foreground">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? "Generating..." : "Generate from Spec"}
        </Button>
      </div>

      {/* Prompt cards */}
      <div className="flex-1 overflow-auto p-6">
        {prompts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">No prompts yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate a prompt from your spec to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {prompts.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer transition-colors hover:bg-secondary/30"
                onClick={() => setSelectedPrompt(p)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {p.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-mono">
                      spec v{p.specVersion}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePrompt(p.id);
                        toast.success("Prompt deleted");
                      }}
                      aria-label="Delete prompt"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 font-mono text-xs text-muted-foreground">
                    {p.content.slice(0, 200)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
