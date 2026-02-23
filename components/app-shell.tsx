"use client";

import { useState } from "react";
import {
  FileText,
  Database,
  MessageSquare,
  ClipboardCheck,
  Play,
  ChevronDown,
  Plus,
  Trash2,
  Key,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { useWorkbench } from "@/lib/store";
import type { SectionId } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { SpecEditor } from "@/components/specs/spec-editor";
import { DatasetBrowser } from "@/components/dataset/dataset-browser";
import { PromptList } from "@/components/prompts/prompt-list";
import { EvalManager } from "@/components/evals/eval-manager";
import { RunsSection } from "@/components/runs/runs-section";

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "specs", label: "Specs", icon: FileText },
  { id: "dataset", label: "Dataset", icon: Database },
  { id: "prompts", label: "Prompts", icon: MessageSquare },
  { id: "evals", label: "Evals", icon: ClipboardCheck },
  { id: "runs", label: "Runs", icon: Play },
];

export function AppShell() {
  const { data, createProject, deleteProject, apiKey, setApiKey } =
    useWorkbench();
  const [activeSection, setActiveSection] = useState<SectionId>("specs");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const activeProject =
    data.projects.find((p) => p.id === activeProjectId) ?? null;

  function handleCreateProject() {
    if (!newProjectName.trim()) return;
    const project = createProject(newProjectName.trim());
    setActiveProjectId(project.id);
    setNewProjectName("");
    setIsCreating(false);
  }

  function handleDeleteProject() {
    if (projectToDelete) {
      deleteProject(projectToDelete);
      if (activeProjectId === projectToDelete) {
        setActiveProjectId(
          data.projects.find((p) => p.id !== projectToDelete)?.id ?? null,
        );
      }
      setProjectToDelete(null);
      setDeleteDialogOpen(false);
    }
  }

  function renderContent() {
    if (!activeProject) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-medium text-foreground">
              No project selected
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create or select a project to get started.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case "specs":
        return <SpecEditor projectId={activeProject.id} />;
      case "dataset":
        return <DatasetBrowser projectId={activeProject.id} />;
      case "prompts":
        return <PromptList projectId={activeProject.id} />;
      case "evals":
        return <EvalManager projectId={activeProject.id} />;
      case "runs":
        return <RunsSection projectId={activeProject.id} />;
      default:
        return null;
    }
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" className="border-r border-border">
        <SidebarHeader className="gap-3 p-4">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Prompt Workbench
          </h1>

          {/* Project Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between text-left font-normal"
              >
                <span className="truncate text-sm">
                  {activeProject ? activeProject.name : "Select project..."}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              {data.projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  className="flex items-center justify-between"
                  onSelect={() => setActiveProjectId(p.id)}
                >
                  <span className="truncate">{p.name}</span>
                  <button
                    className="ml-2 rounded p-0.5 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToDelete(p.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="sr-only">Delete project</span>
                  </button>
                </DropdownMenuItem>
              ))}
              {data.projects.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* API Key (session-only) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`w-full justify-start gap-2 text-left font-normal ${
                  apiKey
                    ? "border-green-300 text-green-700"
                    : "border-amber-300 text-amber-700"
                }`}
              >
                {apiKey ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Key className="h-3.5 w-3.5" />
                )}
                <span className="truncate text-xs">
                  {apiKey ? "API key set" : "Set OpenAI Key"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-foreground">
                  OpenAI API Key
                </p>
                <p className="text-xs text-muted-foreground">
                  Session-only. Never stored or sent anywhere except OpenAI.
                </p>
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-8 font-mono text-xs"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                {apiKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start text-xs text-destructive hover:text-destructive"
                    onClick={() => setApiKey("")}
                  >
                    Clear key
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Inline new project form */}
          {isCreating && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateProject();
              }}
            >
              <Input
                autoFocus
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" className="h-8 shrink-0">
                Create
              </Button>
            </form>
          )}
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workflow</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => setActiveSection(item.id)}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <main className="flex flex-1 flex-col overflow-hidden">
          {renderContent()}
        </main>
      </SidebarInset>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its data
              including specs, datasets, prompts, evals, and runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
