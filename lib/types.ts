// ============================================================
// Prompt Engineering Workbench - Data Model
// ============================================================

export type SectionId = "specs" | "dataset" | "prompts" | "evals" | "runs";

// ---- Project ------------------------------------------------

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Spec ---------------------------------------------------

export interface SpecContent {
  task_description: string;
  input_description: string;
  output_description: string;
  constraints: string[];
  examples: { input: string; output: string }[];
}

export interface SpecVersion {
  id: string;
  projectId: string;
  version: number;
  status: "draft" | "pinned";
  content: SpecContent;
  freeformText: string;
  createdAt: string;
}

// ---- Dataset ------------------------------------------------

export interface DatasetCase {
  id: string;
  projectId: string;
  input: Record<string, unknown>;
  expectedOutput?: string;
  labels: string[];
  createdFromSpecVersion: number;
  source: "synthetic" | "manual";
  createdAt: string;
}

// ---- Prompt -------------------------------------------------

export interface Prompt {
  id: string;
  projectId: string;
  specVersion: number;
  name: string;
  content: string;
  createdAt: string;
}

// ---- Eval ---------------------------------------------------

export interface EvalDefinition {
  id: string;
  projectId: string;
  specVersion: number;
  name: string;
  description: string;
  scoreMode: "pass_fail" | "scale_1_5";
  judgeInstruction: string;
  createdAt: string;
}

// ---- Run & Results ------------------------------------------

export type RunStatus = "running" | "completed" | "failed";

export interface Run {
  id: string;
  projectId: string;
  promptId: string;
  datasetCaseIds: string[];
  evalIds: string[];
  specVersion: number;
  status: RunStatus;
  createdAt: string;
}

export interface RunResult {
  id: string;
  runId: string;
  datasetCaseId: string;
  output: string;
  labels: string[];
  createdAt: string;
}

export interface EvalResult {
  id: string;
  runResultId: string;
  evalId: string;
  score: number;
  reason: string;
  createdAt: string;
}

// ---- Store --------------------------------------------------

export interface WorkbenchData {
  projects: Project[];
  specVersions: SpecVersion[];
  datasetCases: DatasetCase[];
  prompts: Prompt[];
  evalDefinitions: EvalDefinition[];
  runs: Run[];
  runResults: RunResult[];
  evalResults: EvalResult[];
}

export const emptyWorkbenchData: WorkbenchData = {
  projects: [],
  specVersions: [],
  datasetCases: [],
  prompts: [],
  evalDefinitions: [],
  runs: [],
  runResults: [],
  evalResults: [],
};
