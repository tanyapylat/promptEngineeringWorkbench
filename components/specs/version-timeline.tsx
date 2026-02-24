"use client";

import { Pin } from "lucide-react";
import type { SpecVersion } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelect(v.id)}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      v.id === selectedId
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="font-mono">
                      v{v.version}
                      {v.status === "draft" && (
                        <span className="text-xs ml-1 opacity-60">(draft)</span>
                      )}
                    </span>
                    {v.isPinned && (
                      <Pin className="h-3 w-3 fill-amber-500 text-amber-500" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">{v.comment}</p>
                </TooltipContent>
              </Tooltip>
              {v.status === "draft" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      disabled
                      className="rounded-md p-1 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Commit this version first before pinning</p>
                  </TooltipContent>
                </Tooltip>
              ) : !v.isPinned && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPin(v.id);
                      }}
                      className="rounded-md p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Pin this version</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
