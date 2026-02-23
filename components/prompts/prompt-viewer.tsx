"use client";

import { useState } from "react";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import type { Prompt } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface PromptViewerProps {
  prompt: Prompt;
  onBack: () => void;
  onUpdate: (prompt: Prompt) => void;
}

function simpleMarkdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="text-base font-semibold mt-4 mb-2 text-foreground">$1</h3>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h2>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="text-xl font-bold mt-6 mb-3 text-foreground">$1</h1>',
  );

  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">$1</code>',
  );

  // Code blocks
  html = html.replace(
    /```[\w]*\n([\s\S]*?)```/g,
    '<pre class="rounded-md border border-border bg-secondary/50 p-3 my-2 overflow-x-auto"><code class="font-mono text-xs">$1</code></pre>',
  );

  // Bullet lists
  html = html.replace(
    /^- (.+)$/gm,
    '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>',
  );
  html = html.replace(
    /^(\d+)\. (.+)$/gm,
    '<li class="ml-4 list-decimal text-sm leading-relaxed">$2</li>',
  );

  // Line breaks to paragraphs (double newlines)
  html = html.replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-2">');
  html = `<p class="text-sm leading-relaxed mb-2">${html}</p>`;

  return html;
}

export function PromptViewer({ prompt, onBack, onUpdate }: PromptViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(prompt.content);

  function handleSave() {
    onUpdate({ ...prompt, content: editContent });
    setIsEditing(false);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {prompt.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs font-mono">
                spec v{prompt.specVersion}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(prompt.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditContent(prompt.content);
                setIsEditing(true);
              }}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isEditing ? (
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[400px] font-mono text-sm"
          />
        ) : (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: simpleMarkdownToHtml(prompt.content),
            }}
          />
        )}
      </div>
    </div>
  );
}
