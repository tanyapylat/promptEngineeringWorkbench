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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EvalEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    name: string;
    description: string;
    scoreMode: "pass_fail" | "scale_1_5";
    judgeInstruction: string;
  };
  onSave: (data: {
    name: string;
    description: string;
    scoreMode: "pass_fail" | "scale_1_5";
    judgeInstruction: string;
  }) => void;
}

export function EvalEditorDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: EvalEditorDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scoreMode, setScoreMode] = useState<"pass_fail" | "scale_1_5">(
    "pass_fail",
  );
  const [judgeInstruction, setJudgeInstruction] = useState("");

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setDescription(initialData?.description ?? "");
      setScoreMode(initialData?.scoreMode ?? "pass_fail");
      setJudgeInstruction(initialData?.judgeInstruction ?? "");
    }
  }, [open, initialData]);

  function handleSave() {
    if (!name.trim() || !judgeInstruction.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      scoreMode,
      judgeInstruction: judgeInstruction.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Eval" : "Create Eval"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Format Correctness"
              className="text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this eval check?"
              rows={2}
              className="text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Score Mode</label>
            <Select
              value={scoreMode}
              onValueChange={(v) =>
                setScoreMode(v as "pass_fail" | "scale_1_5")
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass_fail">Pass / Fail</SelectItem>
                <SelectItem value="scale_1_5">1-5 Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Judge Instruction
            </label>
            <Textarea
              value={judgeInstruction}
              onChange={(e) => setJudgeInstruction(e.target.value)}
              placeholder="Instructions for the LLM judge..."
              rows={5}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !judgeInstruction.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
