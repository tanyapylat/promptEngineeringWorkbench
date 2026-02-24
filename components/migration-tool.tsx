"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Download, Upload, CheckCircle, XCircle } from "lucide-react";

export function MigrationTool() {
  const [status, setStatus] = useState<"idle" | "migrating" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<any>(null);

  async function handleMigrate() {
    setStatus("migrating");
    setMessage("Reading localStorage data...");

    try {
      // Read localStorage
      const raw = localStorage.getItem("prompt-workbench-data");
      if (!raw) {
        throw new Error("No data found in localStorage");
      }

      const data = JSON.parse(raw);
      
      // Validate data structure
      if (!data.projects || !Array.isArray(data.projects)) {
        throw new Error("Invalid data structure");
      }

      setStats({
        projects: data.projects.length,
        specVersions: data.specVersions?.length || 0,
        datasetCases: data.datasetCases?.length || 0,
        prompts: data.prompts?.length || 0,
        evalDefinitions: data.evalDefinitions?.length || 0,
        runs: data.runs?.length || 0,
      });

      // Create backup
      const timestamp = new Date().toISOString();
      const backup = {
        timestamp,
        data,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workbench-backup-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage(`Found ${data.projects.length} projects. Starting migration...`);

      // Migrate each project
      for (let i = 0; i < data.projects.length; i++) {
        const project = data.projects[i];
        setMessage(`Migrating project ${i + 1}/${data.projects.length}: ${project.name}`);

        // Create project
        const projectRes = await fetch("/api/data/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: project.name }),
        });

        if (!projectRes.ok) {
          throw new Error(`Failed to create project: ${project.name}`);
        }

        const createdProject = await projectRes.json();

        // Migrate spec versions
        const projectSpecs = data.specVersions.filter((s: any) => s.projectId === project.id);
        for (const spec of projectSpecs) {
          await fetch("/api/data/spec-versions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: createdProject.id,
              content: spec.content,
              comment: spec.comment || spec.freeformText || "Migrated spec",
            }),
          });
        }

        // Migrate dataset cases
        const projectCases = data.datasetCases.filter((d: any) => d.projectId === project.id);
        if (projectCases.length > 0) {
          const casesForAPI = projectCases.map((c: any) => ({
            id: c.id,
            projectId: createdProject.id,
            input: c.input,
            expectedOutput: c.expectedOutput,
            labels: c.labels,
            createdFromSpecVersion: c.createdFromSpecVersion,
            source: c.source,
            createdAt: c.createdAt,
          }));
          await fetch("/api/data/dataset-cases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cases: casesForAPI }),
          });
        }

        // Migrate prompts
        const projectPrompts = data.prompts.filter((p: any) => p.projectId === project.id);
        for (const prompt of projectPrompts) {
          await fetch("/api/data/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: prompt.id,
              projectId: createdProject.id,
              specVersion: prompt.specVersion,
              name: prompt.name,
              content: prompt.content,
              createdAt: prompt.createdAt,
            }),
          });
        }

        // Migrate eval definitions
        const projectEvals = data.evalDefinitions.filter((e: any) => e.projectId === project.id);
        for (const evalDef of projectEvals) {
          await fetch("/api/data/eval-definitions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: evalDef.id,
              projectId: createdProject.id,
              specVersion: evalDef.specVersion,
              name: evalDef.name,
              description: evalDef.description,
              scoreMode: evalDef.scoreMode,
              judgeInstruction: evalDef.judgeInstruction,
              createdAt: evalDef.createdAt,
            }),
          });
        }

        // Migrate runs with results
        const projectRuns = data.runs.filter((r: any) => r.projectId === project.id);
        for (const run of projectRuns) {
          await fetch("/api/data/runs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: run.id,
              projectId: createdProject.id,
              promptId: run.promptId,
              datasetCaseIds: run.datasetCaseIds,
              evalIds: run.evalIds,
              specVersion: run.specVersion,
              status: run.status,
              label: run.label,
              createdAt: run.createdAt,
            }),
          });

          // Migrate run results
          const runResults = data.runResults.filter((rr: any) => rr.runId === run.id);
          if (runResults.length > 0) {
            await fetch("/api/data/run-results", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ results: runResults }),
            });

            // Migrate eval results
            const evalResults = data.evalResults.filter((er: any) =>
              runResults.some((rr: any) => rr.id === er.runResultId)
            );
            if (evalResults.length > 0) {
              await fetch("/api/data/eval-results", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ results: evalResults }),
              });
            }
          }
        }
      }

      setStatus("success");
      setMessage("Migration completed successfully! Backup downloaded. You can now reload the page.");
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Migration failed");
    }
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          LocalStorage to PostgreSQL Migration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This tool will migrate your data from browser localStorage to PostgreSQL database.
          A backup file will be automatically downloaded before migration starts.
        </p>

        {stats && (
          <Alert>
            <AlertDescription>
              <div className="text-sm space-y-1">
                <div>Projects: {stats.projects}</div>
                <div>Spec Versions: {stats.specVersions}</div>
                <div>Dataset Cases: {stats.datasetCases}</div>
                <div>Prompts: {stats.prompts}</div>
                <div>Eval Definitions: {stats.evalDefinitions}</div>
                <div>Runs: {stats.runs}</div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert variant={status === "error" ? "destructive" : "default"}>
            <AlertDescription className="flex items-center gap-2">
              {status === "migrating" && <Upload className="h-4 w-4 animate-pulse" />}
              {status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {status === "error" && <XCircle className="h-4 w-4" />}
              {message}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleMigrate}
          disabled={status === "migrating" || status === "success"}
          className="w-full"
        >
          {status === "migrating" ? "Migrating..." : "Start Migration"}
        </Button>

        {status === "success" && (
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Reload Page
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
