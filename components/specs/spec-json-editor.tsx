"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { SpecContent } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SpecJsonEditorProps {
  content: SpecContent;
  onChange: (content: SpecContent) => void;
  readOnly?: boolean;
}

export function SpecJsonEditor({
  content,
  onChange,
  readOnly,
}: SpecJsonEditorProps) {
  const [newConstraint, setNewConstraint] = useState("");

  function updateField<K extends keyof SpecContent>(
    key: K,
    value: SpecContent[K],
  ) {
    onChange({ ...content, [key]: value });
  }

  function addConstraint() {
    if (!newConstraint.trim()) return;
    updateField("constraints", [...content.constraints, newConstraint.trim()]);
    setNewConstraint("");
  }

  function removeConstraint(index: number) {
    updateField(
      "constraints",
      content.constraints.filter((_, i) => i !== index),
    );
  }

  function updateExample(
    index: number,
    field: "input" | "output",
    value: string,
  ) {
    const updated = content.examples.map((ex, i) =>
      i === index ? { ...ex, [field]: value } : ex,
    );
    updateField("examples", updated);
  }

  function addExample() {
    updateField("examples", [...content.examples, { input: "", output: "" }]);
  }

  function removeExample(index: number) {
    updateField(
      "examples",
      content.examples.filter((_, i) => i !== index),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">Structured Spec</h3>

      {/* Task Description */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Task Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={content.task_description}
            onChange={(e) => updateField("task_description", e.target.value)}
            readOnly={readOnly}
            rows={3}
            className="text-sm"
            placeholder="What should the LLM do?"
          />
        </CardContent>
      </Card>

      {/* Input / Output descriptions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Input Format</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content.input_description}
              onChange={(e) => updateField("input_description", e.target.value)}
              readOnly={readOnly}
              rows={3}
              className="text-sm"
              placeholder="Describe the expected input..."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Output Format</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={content.output_description}
              onChange={(e) =>
                updateField("output_description", e.target.value)
              }
              readOnly={readOnly}
              rows={3}
              className="text-sm"
              placeholder="Describe the expected output..."
            />
          </CardContent>
        </Card>
      </div>

      {/* Constraints */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Constraints</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {content.constraints.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm">
                {c}
              </span>
              {!readOnly && (
                <button
                  onClick={() => removeConstraint(i)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove constraint"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <div className="flex gap-2">
              <Input
                value={newConstraint}
                onChange={(e) => setNewConstraint(e.target.value)}
                placeholder="Add a constraint..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addConstraint();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addConstraint}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Examples */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Examples</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {content.examples.map((ex, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-md border border-border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Example {i + 1}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => removeExample(i)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove example"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Input
                  </label>
                  <Textarea
                    value={ex.input}
                    onChange={(e) => updateExample(i, "input", e.target.value)}
                    readOnly={readOnly}
                    rows={2}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Output
                  </label>
                  <Textarea
                    value={ex.output}
                    onChange={(e) => updateExample(i, "output", e.target.value)}
                    readOnly={readOnly}
                    rows={2}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={addExample}
              className="self-start"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Example
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
