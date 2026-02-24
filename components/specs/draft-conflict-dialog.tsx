"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DraftConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftVersion: number;
  selectedVersion: number;
  onContinueEditing: () => void;
  onDiscardAndCreateNew: () => void;
}

export function DraftConflictDialog({
  open,
  onOpenChange,
  draftVersion,
  selectedVersion,
  onContinueEditing,
  onDiscardAndCreateNew,
}: DraftConflictDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Draft Already Exists</DialogTitle>
          </div>
          <DialogDescription>
            You already have a draft version (v{draftVersion}) in progress. What would you like to do?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm">
          <p>
            You're trying to edit v{selectedVersion}, but there's already a draft version (v{draftVersion}) for this project.
          </p>
          <p className="text-muted-foreground">
            Only one draft can exist per project at a time.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="default"
            onClick={() => {
              onContinueEditing();
              onOpenChange(false);
            }}
            className="w-full"
          >
            Continue Editing v{draftVersion} (Current Draft)
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDiscardAndCreateNew();
              onOpenChange(false);
            }}
            className="w-full"
          >
            Discard v{draftVersion} and Create New Draft from v{selectedVersion}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
