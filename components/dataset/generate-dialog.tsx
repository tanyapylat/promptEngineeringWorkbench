"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (count: number, instructions: string) => void;
  isGenerating: boolean;
}

export function GenerateDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: GenerateDialogProps) {
  const [count, setCount] = useState(5);
  const [instructions, setInstructions] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Dataset Cases</DialogTitle>
          <DialogDescription>
            Synthesize test cases from your current spec using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Number of cases
            </label>
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Additional instructions (optional)
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="text-sm"
              placeholder="e.g., 'Include edge cases with very long inputs' or 'Focus on error scenarios'"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onGenerate(count, instructions)}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
