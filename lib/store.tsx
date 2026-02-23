"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
} from "react";
import type {
  WorkbenchData,
  Project,
  SpecVersion,
  SpecContent,
  DatasetCase,
  Prompt,
  EvalDefinition,
  Run,
  RunResult,
  EvalResult,
} from "./types";

const STORAGE_KEY = "prompt-workbench-data";

const defaultData: WorkbenchData = {
  projects: [],
  specVersions: [],
  datasetCases: [],
  prompts: [],
  evalDefinitions: [],
  runs: [],
  runResults: [],
  evalResults: [],
};

function loadData(): WorkbenchData {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    return JSON.parse(raw) as WorkbenchData;
  } catch {
    return defaultData;
  }
}

// ---- Reducer ------------------------------------------------

type Action =
  | { type: "SET_DATA"; data: WorkbenchData }
  | { type: "ADD_PROJECT"; project: Project }
  | { type: "UPDATE_PROJECT"; project: Project }
  | { type: "DELETE_PROJECT"; projectId: string }
  | { type: "ADD_SPEC_VERSION"; specVersion: SpecVersion }
  | { type: "UPDATE_SPEC_VERSION"; specVersion: SpecVersion }
  | { type: "ADD_DATASET_CASES"; cases: DatasetCase[] }
  | { type: "UPDATE_DATASET_CASE"; datasetCase: DatasetCase }
  | { type: "DELETE_DATASET_CASE"; caseId: string }
  | { type: "ADD_PROMPT"; prompt: Prompt }
  | { type: "UPDATE_PROMPT"; prompt: Prompt }
  | { type: "DELETE_PROMPT"; promptId: string }
  | { type: "ADD_EVAL_DEFINITION"; evalDef: EvalDefinition }
  | { type: "UPDATE_EVAL_DEFINITION"; evalDef: EvalDefinition }
  | { type: "DELETE_EVAL_DEFINITION"; evalId: string }
  | { type: "ADD_RUN"; run: Run }
  | { type: "UPDATE_RUN"; run: Run }
  | { type: "ADD_RUN_RESULTS"; results: RunResult[] }
  | { type: "UPDATE_RUN_RESULT"; result: RunResult }
  | { type: "ADD_EVAL_RESULTS"; results: EvalResult[] };

function reducer(state: WorkbenchData, action: Action): WorkbenchData {
  switch (action.type) {
    case "SET_DATA":
      return action.data;

    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.project] };
    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.project.id ? action.project : p,
        ),
      };
    case "DELETE_PROJECT": {
      const pid = action.projectId;
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== pid),
        specVersions: state.specVersions.filter((s) => s.projectId !== pid),
        datasetCases: state.datasetCases.filter((d) => d.projectId !== pid),
        prompts: state.prompts.filter((p) => p.projectId !== pid),
        evalDefinitions: state.evalDefinitions.filter(
          (e) => e.projectId !== pid,
        ),
        runs: state.runs.filter((r) => r.projectId !== pid),
      };
    }

    case "ADD_SPEC_VERSION":
      return {
        ...state,
        specVersions: [...state.specVersions, action.specVersion],
      };
    case "UPDATE_SPEC_VERSION":
      return {
        ...state,
        specVersions: state.specVersions.map((s) =>
          s.id === action.specVersion.id ? action.specVersion : s,
        ),
      };

    case "ADD_DATASET_CASES":
      return {
        ...state,
        datasetCases: [...state.datasetCases, ...action.cases],
      };
    case "UPDATE_DATASET_CASE":
      return {
        ...state,
        datasetCases: state.datasetCases.map((c) =>
          c.id === action.datasetCase.id ? action.datasetCase : c,
        ),
      };
    case "DELETE_DATASET_CASE":
      return {
        ...state,
        datasetCases: state.datasetCases.filter((c) => c.id !== action.caseId),
      };

    case "ADD_PROMPT":
      return { ...state, prompts: [...state.prompts, action.prompt] };
    case "UPDATE_PROMPT":
      return {
        ...state,
        prompts: state.prompts.map((p) =>
          p.id === action.prompt.id ? action.prompt : p,
        ),
      };
    case "DELETE_PROMPT":
      return {
        ...state,
        prompts: state.prompts.filter((p) => p.id !== action.promptId),
      };

    case "ADD_EVAL_DEFINITION":
      return {
        ...state,
        evalDefinitions: [...state.evalDefinitions, action.evalDef],
      };
    case "UPDATE_EVAL_DEFINITION":
      return {
        ...state,
        evalDefinitions: state.evalDefinitions.map((e) =>
          e.id === action.evalDef.id ? action.evalDef : e,
        ),
      };
    case "DELETE_EVAL_DEFINITION":
      return {
        ...state,
        evalDefinitions: state.evalDefinitions.filter(
          (e) => e.id !== action.evalId,
        ),
      };

    case "ADD_RUN":
      return { ...state, runs: [...state.runs, action.run] };
    case "UPDATE_RUN":
      return {
        ...state,
        runs: state.runs.map((r) => (r.id === action.run.id ? action.run : r)),
      };

    case "ADD_RUN_RESULTS":
      return { ...state, runResults: [...state.runResults, ...action.results] };
    case "UPDATE_RUN_RESULT":
      return {
        ...state,
        runResults: state.runResults.map((r) =>
          r.id === action.result.id ? action.result : r,
        ),
      };

    case "ADD_EVAL_RESULTS":
      return {
        ...state,
        evalResults: [...state.evalResults, ...action.results],
      };

    default:
      return state;
  }
}

// ---- Context ------------------------------------------------

interface WorkbenchContextValue {
  data: WorkbenchData;
  // Project
  createProject: (name: string) => Project;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => void;
  // Spec
  addSpecVersion: (
    projectId: string,
    content: SpecContent,
    freeformText: string,
  ) => SpecVersion;
  updateSpecVersion: (sv: SpecVersion) => void;
  pinSpecVersion: (id: string) => void;
  getSpecVersionsForProject: (projectId: string) => SpecVersion[];
  getLatestSpec: (projectId: string) => SpecVersion | undefined;
  getPinnedSpec: (projectId: string) => SpecVersion | undefined;
  // Dataset
  addDatasetCases: (cases: DatasetCase[]) => void;
  updateDatasetCase: (dc: DatasetCase) => void;
  deleteDatasetCase: (id: string) => void;
  getDatasetForProject: (projectId: string) => DatasetCase[];
  // Prompt
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (prompt: Prompt) => void;
  deletePrompt: (id: string) => void;
  getPromptsForProject: (projectId: string) => Prompt[];
  // Eval
  addEvalDefinition: (evalDef: EvalDefinition) => void;
  updateEvalDefinition: (evalDef: EvalDefinition) => void;
  deleteEvalDefinition: (id: string) => void;
  getEvalsForProject: (projectId: string) => EvalDefinition[];
  // Run
  addRun: (run: Run) => void;
  updateRun: (run: Run) => void;
  addRunResults: (results: RunResult[]) => void;
  updateRunResult: (result: RunResult) => void;
  addEvalResults: (results: EvalResult[]) => void;
  getRunsForProject: (projectId: string) => Run[];
  getRunResults: (runId: string) => RunResult[];
  getEvalResults: (runResultId: string) => EvalResult[];
  getEvalResultsForRun: (runId: string) => EvalResult[];
  // API Key (session-only, never persisted)
  apiKey: string;
  setApiKey: (key: string) => void;
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [data, dispatch] = useReducer(reducer, defaultData);
  const initialized = useRef(false);
  const [apiKey, setApiKey] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const stored = loadData();
      dispatch({ type: "SET_DATA", data: stored });
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (initialized.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  // ---- Project ----
  const createProject = useCallback((name: string): Project => {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_PROJECT", project });
    return project;
  }, []);
  const updateProject = useCallback(
    (project: Project) => dispatch({ type: "UPDATE_PROJECT", project }),
    [],
  );
  const deleteProject = useCallback(
    (projectId: string) => dispatch({ type: "DELETE_PROJECT", projectId }),
    [],
  );

  // ---- Spec ----
  const addSpecVersion = useCallback(
    (
      projectId: string,
      content: SpecContent,
      freeformText: string,
    ): SpecVersion => {
      const existing = data.specVersions.filter(
        (s) => s.projectId === projectId,
      );
      const version =
        existing.length > 0
          ? Math.max(...existing.map((s) => s.version)) + 1
          : 1;
      const sv: SpecVersion = {
        id: crypto.randomUUID(),
        projectId,
        version,
        status: "draft",
        content,
        freeformText,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_SPEC_VERSION", specVersion: sv });
      return sv;
    },
    [data.specVersions],
  );
  const updateSpecVersion = useCallback(
    (sv: SpecVersion) =>
      dispatch({ type: "UPDATE_SPEC_VERSION", specVersion: sv }),
    [],
  );
  const pinSpecVersion = useCallback(
    (id: string) => {
      const sv = data.specVersions.find((s) => s.id === id);
      if (sv) {
        // Unpin others in same project
        data.specVersions
          .filter((s) => s.projectId === sv.projectId && s.status === "pinned")
          .forEach((s) =>
            dispatch({
              type: "UPDATE_SPEC_VERSION",
              specVersion: { ...s, status: "draft" },
            }),
          );
        dispatch({
          type: "UPDATE_SPEC_VERSION",
          specVersion: { ...sv, status: "pinned" },
        });
      }
    },
    [data.specVersions],
  );
  const getSpecVersionsForProject = useCallback(
    (projectId: string) =>
      data.specVersions
        .filter((s) => s.projectId === projectId)
        .sort((a, b) => b.version - a.version),
    [data.specVersions],
  );
  const getLatestSpec = useCallback(
    (projectId: string) => {
      const versions = data.specVersions.filter(
        (s) => s.projectId === projectId,
      );
      if (versions.length === 0) return undefined;
      return versions.reduce((a, b) => (a.version > b.version ? a : b));
    },
    [data.specVersions],
  );
  const getPinnedSpec = useCallback(
    (projectId: string) =>
      data.specVersions.find(
        (s) => s.projectId === projectId && s.status === "pinned",
      ),
    [data.specVersions],
  );

  // ---- Dataset ----
  const addDatasetCases = useCallback(
    (cases: DatasetCase[]) => dispatch({ type: "ADD_DATASET_CASES", cases }),
    [],
  );
  const updateDatasetCase = useCallback(
    (dc: DatasetCase) =>
      dispatch({ type: "UPDATE_DATASET_CASE", datasetCase: dc }),
    [],
  );
  const deleteDatasetCase = useCallback(
    (id: string) => dispatch({ type: "DELETE_DATASET_CASE", caseId: id }),
    [],
  );
  const getDatasetForProject = useCallback(
    (projectId: string) =>
      data.datasetCases.filter((d) => d.projectId === projectId),
    [data.datasetCases],
  );

  // ---- Prompt ----
  const addPrompt = useCallback(
    (prompt: Prompt) => dispatch({ type: "ADD_PROMPT", prompt }),
    [],
  );
  const updatePrompt = useCallback(
    (prompt: Prompt) => dispatch({ type: "UPDATE_PROMPT", prompt }),
    [],
  );
  const deletePrompt = useCallback(
    (id: string) => dispatch({ type: "DELETE_PROMPT", promptId: id }),
    [],
  );
  const getPromptsForProject = useCallback(
    (projectId: string) =>
      data.prompts
        .filter((p) => p.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.prompts],
  );

  // ---- Eval ----
  const addEvalDefinition = useCallback(
    (evalDef: EvalDefinition) =>
      dispatch({ type: "ADD_EVAL_DEFINITION", evalDef }),
    [],
  );
  const updateEvalDefinition = useCallback(
    (evalDef: EvalDefinition) =>
      dispatch({ type: "UPDATE_EVAL_DEFINITION", evalDef }),
    [],
  );
  const deleteEvalDefinition = useCallback(
    (id: string) => dispatch({ type: "DELETE_EVAL_DEFINITION", evalId: id }),
    [],
  );
  const getEvalsForProject = useCallback(
    (projectId: string) =>
      data.evalDefinitions.filter((e) => e.projectId === projectId),
    [data.evalDefinitions],
  );

  // ---- Run ----
  const addRun = useCallback(
    (run: Run) => dispatch({ type: "ADD_RUN", run }),
    [],
  );
  const updateRun = useCallback(
    (run: Run) => dispatch({ type: "UPDATE_RUN", run }),
    [],
  );
  const addRunResults = useCallback(
    (results: RunResult[]) => dispatch({ type: "ADD_RUN_RESULTS", results }),
    [],
  );
  const updateRunResult = useCallback(
    (result: RunResult) => dispatch({ type: "UPDATE_RUN_RESULT", result }),
    [],
  );
  const addEvalResults = useCallback(
    (results: EvalResult[]) => dispatch({ type: "ADD_EVAL_RESULTS", results }),
    [],
  );
  const getRunsForProject = useCallback(
    (projectId: string) =>
      data.runs
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.runs],
  );
  const getRunResults = useCallback(
    (runId: string) => data.runResults.filter((r) => r.runId === runId),
    [data.runResults],
  );
  const getEvalResults = useCallback(
    (runResultId: string) =>
      data.evalResults.filter((e) => e.runResultId === runResultId),
    [data.evalResults],
  );
  const getEvalResultsForRun = useCallback(
    (runId: string) => {
      const resultIds = new Set(
        data.runResults.filter((r) => r.runId === runId).map((r) => r.id),
      );
      return data.evalResults.filter((e) => resultIds.has(e.runResultId));
    },
    [data.runResults, data.evalResults],
  );

  const value: WorkbenchContextValue = {
    data,
    createProject,
    updateProject,
    deleteProject,
    addSpecVersion,
    updateSpecVersion,
    pinSpecVersion,
    getSpecVersionsForProject,
    getLatestSpec,
    getPinnedSpec,
    addDatasetCases,
    updateDatasetCase,
    deleteDatasetCase,
    getDatasetForProject,
    addPrompt,
    updatePrompt,
    deletePrompt,
    getPromptsForProject,
    addEvalDefinition,
    updateEvalDefinition,
    deleteEvalDefinition,
    getEvalsForProject,
    addRun,
    updateRun,
    addRunResults,
    updateRunResult,
    addEvalResults,
    getRunsForProject,
    getRunResults,
    getEvalResults,
    getEvalResultsForRun,
    apiKey,
    setApiKey,
  };

  return (
    <WorkbenchContext.Provider value={value}>
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbench() {
  const ctx = useContext(WorkbenchContext);
  if (!ctx)
    throw new Error("useWorkbench must be used within WorkbenchProvider");
  return ctx;
}
