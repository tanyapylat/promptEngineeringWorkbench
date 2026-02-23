"use client";

import { Pin } from "lucide-react";
import type { SpecVersion } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface VersionTimelineProps {
  versions: SpecVersion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
}

export function VersionTimeline({
  versions,
  selectedId,
  onSelect,
  onPin,
}: VersionTimelineProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">Version History</h3>
      <div className="flex flex-wrap gap-2">
        {versions.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              v.id === selectedId
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:bg-secondary"
            }`}
          >
            <span className="font-mono">v{v.version}</span>
            {v.status === "pinned" && <Pin className="h-3 w-3" />}
          </button>
        ))}
      </div>
      {selectedId && (
        <div className="flex gap-2">
          {versions.find((v) => v.id === selectedId)?.status !== "pinned" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPin(selectedId)}
            >
              <Pin className="mr-1 h-3.5 w-3.5" />
              Pin this version
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
