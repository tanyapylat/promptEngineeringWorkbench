"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CaseEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    input: Record<string, unknown>;
    expectedOutput?: string;
    labels: string[];
  };
  onSave: (data: {
    input: Record<string, unknown>;
    expectedOutput?: string;
    labels: string[];
  }) => void;
}

export function CaseEditorDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: CaseEditorDialogProps) {
  const [inputJson, setInputJson] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (open) {
      setInputJson(
        initialData ? JSON.stringify(initialData.input, null, 2) : "{\n  \n}",
      );
      setExpectedOutput(initialData?.expectedOutput ?? "");
      setLabels(initialData?.labels ?? []);
      setJsonError("");
    }
  }, [open, initialData]);

  function handleSave() {
    try {
      const parsed = JSON.parse(inputJson);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("Input must be a JSON object");
        return;
      }
      setJsonError("");
      onSave({
        input: parsed,
        expectedOutput: expectedOutput || undefined,
        labels,
      });
    } catch {
      setJsonError("Invalid JSON");
    }
  }

  function addLabel() {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Case" : "Add Case"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Input (JSON)
            </label>
            <Textarea
              value={inputJson}
              onChange={(e) => {
                setInputJson(e.target.value);
                setJsonError("");
              }}
              rows={6}
              className="font-mono text-sm"
              placeholder='{ "text": "..." }'
            />
            {jsonError && (
              <p className="mt-1 text-xs text-destructive">{jsonError}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Expected Output (optional)
            </label>
            <Textarea
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              rows={3}
              className="font-mono text-sm"
              placeholder="Expected LLM output..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Labels</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {labels.map((l) => (
                <Badge key={l} variant="outline" className="gap-1">
                  {l}
                  <button
                    onClick={() => setLabels(labels.filter((x) => x !== l))}
                    aria-label={`Remove ${l}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Add label..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLabel();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addLabel}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
