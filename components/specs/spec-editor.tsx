"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkbench } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import type { SpecContent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { SpecJsonEditor } from "./spec-json-editor";
import { VersionTimeline } from "./version-timeline";
import { DraftConflictDialog } from "./draft-conflict-dialog";

export function SpecEditor({ projectId }: { projectId: string }) {
  const {
    getSpecVersionsForProject,
    getLatestSpec,
    getPinnedSpec,
    getDraftSpec,
    getCommittedSpecs,
    addSpecVersion,
    updateSpecVersion,
    deleteSpecVersion,
    pinSpecVersion,
    isVersionEditable,
    apiKey,
  } = useWorkbench();

  const versions = getSpecVersionsForProject(projectId);
  const latestSpec = getLatestSpec(projectId);
  const pinnedSpec = getPinnedSpec(projectId);
  const draftSpec = getDraftSpec(projectId);
  const committedSpecs = getCommittedSpecs(projectId);

  const [instructions, setInstructions] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    draftSpec?.id ?? latestSpec?.id ?? null,
  );
  
  // Draft conflict dialog state
  const [showDraftConflict, setShowDraftConflict] = useState(false);
  const [pendingEditVersionId, setPendingEditVersionId] = useState<string | null>(null);
  
  // Track if we're currently creating a draft to prevent duplicates
  const isCreatingDraftRef = useRef(false);

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ?? latestSpec ?? null;

  // Update selected version when draft is created
  useEffect(() => {
    if (draftSpec && !selectedVersionId) {
      setSelectedVersionId(draftSpec.id);
    }
  }, [draftSpec, selectedVersionId]);
  
  // Reset the creating draft flag when switching versions
  useEffect(() => {
    isCreatingDraftRef.current = false;
  }, [selectedVersionId]);

  async function handleRefine() {
    if (!instructions.trim()) {
      toast.error("Please enter instructions first.");
      return;
    }

    // Check if we're refining a committed version and draft exists
    if (selectedVersion?.status === "committed" && draftSpec) {
      setPendingEditVersionId(selectedVersion.id);
      setShowDraftConflict(true);
      return;
    }

    await executeRefine();
  }

  async function executeRefine() {
    setIsRefining(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey?.trim()) headers["x-api-key"] = apiKey;

      // Use pinned spec as base, or selected version if it's a draft
      const baseSpec = selectedVersion?.status === "draft" 
        ? selectedVersion.content 
        : pinnedSpec?.content;

      const res = await apiFetch("/api/ai/refine-spec", {
        method: "POST",
        headers,
        body: JSON.stringify({
          instructions: instructions.trim(),
          existingSpec: baseSpec,
        }),
      });

      const data = await res.json();
      const content: SpecContent = data.spec;
      
      // If we have a draft, update it; otherwise create new draft
      if (draftSpec) {
        await updateSpecVersion({
          ...draftSpec,
          content,
          comment: instructions.trim(), // Always update comment with new instructions
        });
        setSelectedVersionId(draftSpec.id);
        toast.success(`Draft v${draftSpec.version} updated with refinement`);
      } else {
        const newVersion = await addSpecVersion(
          projectId,
          content,
          instructions.trim(),
        );
        setSelectedVersionId(newVersion.id);
        toast.success(`Spec v${newVersion.version} created`);
      }
      
      setInstructions("");
    } catch {
      // apiFetch already shows toast
    } finally {
      setIsRefining(false);
    }
  }

  async function handleContentUpdate(content: SpecContent) {
    if (!selectedVersion) return;
    
    // If editing a committed version, check for draft conflict
    if (selectedVersion.status === "committed") {
      if (draftSpec) {
        setPendingEditVersionId(selectedVersion.id);
        setShowDraftConflict(true);
        return;
      }
      
      // Check if we're already creating a draft
      if (isCreatingDraftRef.current) {
        return; // Ignore this edit, draft creation is in progress
      }
      
      // No draft exists, create new draft from this version
      isCreatingDraftRef.current = true;
      try {
        const newVersion = await addSpecVersion(
          projectId,
          content,
          `Based on v${selectedVersion.version}`,
        );
        setSelectedVersionId(newVersion.id);
        toast.success(`Created draft v${newVersion.version} from v${selectedVersion.version}`);
      } catch (error) {
        console.error("Failed to create new version:", error);
        toast.error("Failed to create new version");
      } finally {
        isCreatingDraftRef.current = false;
      }
      return;
    }
    
    // Update the current draft in-place
    try {
      await updateSpecVersion({ ...selectedVersion, content });
    } catch (error) {
      console.error("Failed to update spec version:", error);
      toast.error("Failed to update spec version");
    }
  }

  async function handleCommentChange(newComment: string) {
    if (!selectedVersion) return;
    
    // If editing a committed version, check for draft conflict
    if (selectedVersion.status === "committed") {
      if (draftSpec) {
        setPendingEditVersionId(selectedVersion.id);
        setShowDraftConflict(true);
        return;
      }
      
      // Check if we're already creating a draft
      if (isCreatingDraftRef.current) {
        return; // Ignore this edit, draft creation is in progress
      }
      
      // No draft exists, create new draft from this version
      isCreatingDraftRef.current = true;
      try {
        const newVersion = await addSpecVersion(
          projectId,
          selectedVersion.content,
          newComment || `Based on v${selectedVersion.version}`,
        );
        setSelectedVersionId(newVersion.id);
        toast.success(`Created draft v${newVersion.version} from v${selectedVersion.version}`);
      } catch (error) {
        console.error("Failed to create new version:", error);
        toast.error("Failed to create new version");
      } finally {
        isCreatingDraftRef.current = false;
      }
      return;
    }
    
    // Update the current draft in-place
    updateSpecVersion({
      ...selectedVersion,
      comment: newComment,
    });
  }

  async function handleCommitVersion() {
    if (!selectedVersion) return;
    
    if (!selectedVersion.comment.trim()) {
      toast.error("Please add a version comment before committing.");
      return;
    }

    try {
      // Change status from draft to committed
      await updateSpecVersion({
        ...selectedVersion,
        status: "committed",
      });
      
      toast.success(`Version v${selectedVersion.version} committed`);
    } catch (error) {
      console.error("Failed to commit version:", error);
      toast.error("Failed to commit version");
    }
  }

  async function handlePinVersion(versionId: string) {
    try {
      await pinSpecVersion(versionId);
      const version = versions.find(v => v.id === versionId);
      toast.success(`Version v${version?.version} pinned`);
    } catch (error) {
      console.error("Failed to pin version:", error);
      toast.error("Failed to pin version");
    }
  }

  async function handleContinueEditingDraft() {
    if (draftSpec) {
      setSelectedVersionId(draftSpec.id);
      toast.info(`Switched to draft v${draftSpec.version}`);
    }
  }

  async function handleDiscardAndCreateNew() {
    if (!draftSpec || !pendingEditVersionId) return;
    
    const targetVersion = versions.find(v => v.id === pendingEditVersionId);
    if (!targetVersion) return;

    try {
      // Delete the existing draft
      await deleteSpecVersion(draftSpec.id);
      
      // Create new draft from the selected version
      const newVersion = await addSpecVersion(
        projectId,
        targetVersion.content,
        `Based on v${targetVersion.version}`,
      );
      
      setSelectedVersionId(newVersion.id);
      toast.success(`Created new draft v${newVersion.version} from v${targetVersion.version}`);
    } catch (error) {
      console.error("Failed to discard and create new:", error);
      toast.error("Failed to create new draft");
    } finally {
      setPendingEditVersionId(null);
    }
  }

  const isEditable = selectedVersion
    ? isVersionEditable(selectedVersion, versions)
    : false;

  const hasExistingSpec = versions.length > 0;
  const isCreatingNew = !hasExistingSpec;

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Spec Editor</h2>
            <p className="text-sm text-muted-foreground">
              {isCreatingNew
                ? "Describe your task to create a structured spec."
                : "Refine your spec or edit it manually."}
            </p>
          </div>
        {selectedVersion && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono">
              v{selectedVersion.version}
              {selectedVersion.status === "draft" && (
                <span className="text-muted-foreground"> (draft)</span>
              )}
              {selectedVersion.isPinned && (
                <span className="text-amber-600 dark:text-amber-400"> (pinned)</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        {/* Instructions input */}
        <div className="flex flex-col gap-3">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="instructions"
          >
            Instructions for AI
          </label>
          <p className="text-xs text-muted-foreground">
            {isCreatingNew
              ? "Describe what you want the LLM to do"
              : "Describe how to refine the spec"}
          </p>
          <Textarea
            id="instructions"
            placeholder={
              isCreatingNew
                ? "Describe the task. For example: 'Classify customer support emails into categories (billing, technical, general) and extract the main issue.'"
                : "Describe how to refine the spec. For example: 'Add a constraint about response time' or 'Include examples for edge cases'"
            }
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            className="resize-y font-mono text-sm"
          />
          <div className="flex justify-end">
            <Button type="button" onClick={handleRefine} disabled={isRefining}>
              {isRefining ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isRefining
                ? isCreatingNew
                  ? "Creating..."
                  : "Refining..."
                : isCreatingNew
                  ? "Create Spec"
                  : "Refine to Spec"}
            </Button>
          </div>
        </div>

        {/* Version Comment */}
        {selectedVersion && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="comment"
                >
                  Version Comment <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Describe this version (like a commit message) - required to commit
                  {!isEditable && selectedVersion.status === "committed" && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (Read-only - editing creates new draft)
                    </span>
                  )}
                </p>
              </div>
              {isEditable && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={handleCommitVersion}
                      disabled={!selectedVersion.comment.trim()}
                    >
                      Commit Version
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Freeze this version and make it immutable</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <Textarea
              id="comment"
              placeholder="What changed in this version?"
              value={selectedVersion.comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              rows={2}
              className="resize-y text-sm"
            />
          </div>
        )}

        {/* Structured spec editor */}
        {selectedVersion && (
          <div className="flex flex-col gap-2">
            {!isEditable && (
              <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  📝 This is a committed version (read-only). Start editing any field below to create a new draft from this version.
                </p>
              </div>
            )}
            <SpecJsonEditor
              content={selectedVersion.content}
              onChange={handleContentUpdate}
              readOnly={false}
            />
          </div>
        )}

        {/* Version timeline */}
        {versions.length > 0 && (
          <VersionTimeline
            versions={versions}
            selectedId={selectedVersionId}
            onSelect={(id) => setSelectedVersionId(id)}
            onPin={handlePinVersion}
          />
        )}
      </div>
    </div>

    {/* Draft conflict dialog */}
    {draftSpec && pendingEditVersionId && (
      <DraftConflictDialog
        open={showDraftConflict}
        onOpenChange={setShowDraftConflict}
        draftVersion={draftSpec.version}
        selectedVersion={versions.find(v => v.id === pendingEditVersionId)?.version ?? 0}
        onContinueEditing={handleContinueEditingDraft}
        onDiscardAndCreateNew={handleDiscardAndCreateNew}
      />
    )}
    </TooltipProvider>
  );
}
