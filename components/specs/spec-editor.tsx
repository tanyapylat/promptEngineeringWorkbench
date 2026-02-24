"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkbench } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type { SpecContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SpecJsonEditor } from "./spec-json-editor";
import { VersionTimeline } from "./version-timeline";

export function SpecEditor({ projectId }: { projectId: string }) {
  const {
    getSpecVersionsForProject,
    getLatestSpec,
    addSpecVersion,
    updateSpecVersion,
    pinSpecVersion,
    apiKey,
  } = useWorkbench();

  const versions = getSpecVersionsForProject(projectId);
  const latestSpec = getLatestSpec(projectId);

  const [freeformText, setFreeformText] = useState(
    latestSpec?.freeformText ?? "",
  );
  const [isRefining, setIsRefining] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    latestSpec?.id ?? null,
  );

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ?? latestSpec ?? null;

  async function handleRefine() {
    if (!freeformText.trim()) {
      toast.error("Please enter a task description first.");
      return;
    }

    setIsRefining(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey?.trim()) headers["x-api-key"] = apiKey;

      const res = await apiFetch("/api/ai/refine-spec", {
        method: "POST",
        headers,
        body: JSON.stringify({ freeformText }),
      });

      const data = await res.json();
      const content: SpecContent = data.spec;
      const newVersion = await addSpecVersion(projectId, content, freeformText);
      setSelectedVersionId(newVersion.id);
      toast.success(`Spec v${newVersion.version} created`);
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsRefining(false);
    }
  }

  async function handleContentUpdate(content: SpecContent) {
    if (!selectedVersion) return;
    try {
      await updateSpecVersion({ ...selectedVersion, content });
    } catch (error) {
      console.error("Failed to update spec version:", error);
      toast.error("Failed to update spec version");
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Spec Editor</h2>
          <p className="text-sm text-muted-foreground">
            Describe your task, then refine it into a structured spec.
          </p>
        </div>
        {selectedVersion && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">
              v{selectedVersion.version}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                selectedVersion.status === "pinned"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {selectedVersion.status}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Freeform input */}
        <div className="flex flex-col gap-3">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="freeform"
          >
            Task Description
          </label>
          <Textarea
            id="freeform"
            placeholder="Describe what you want the LLM to do. For example: 'Classify customer support emails into categories (billing, technical, general) and extract the main issue as a one-sentence summary.'"
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            rows={5}
            className="resize-y font-mono text-sm"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleRefine}
              disabled={isRefining}
            >
              {isRefining ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isRefining ? "Refining..." : "Refine to Spec"}
            </Button>
          </div>
        </div>

        {/* Structured spec editor */}
        {selectedVersion && (
          <SpecJsonEditor
            content={selectedVersion.content}
            onChange={handleContentUpdate}
            readOnly={selectedVersion.status === "pinned"}
          />
        )}

        {/* Version timeline */}
        {versions.length > 0 && (
          <VersionTimeline
            versions={versions}
            selectedId={selectedVersionId}
            onSelect={(id) => setSelectedVersionId(id)}
            onPin={(id) => pinSpecVersion(id)}
          />
        )}
      </div>
    </div>
  );
}
