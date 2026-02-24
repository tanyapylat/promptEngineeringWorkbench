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
  isLoading: boolean;
  // Project
  createProject: (name: string) => Promise<Project>;
  updateProject: (project: Project) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  // Spec
  addSpecVersion: (
    projectId: string,
    content: SpecContent,
    freeformText: string,
  ) => Promise<SpecVersion>;
  updateSpecVersion: (sv: SpecVersion) => Promise<void>;
  pinSpecVersion: (id: string) => Promise<void>;
  getSpecVersionsForProject: (projectId: string) => SpecVersion[];
  getLatestSpec: (projectId: string) => SpecVersion | undefined;
  getPinnedSpec: (projectId: string) => SpecVersion | undefined;
  // Dataset
  addDatasetCases: (cases: DatasetCase[]) => Promise<void>;
  updateDatasetCase: (dc: DatasetCase) => Promise<void>;
  deleteDatasetCase: (id: string) => Promise<void>;
  getDatasetForProject: (projectId: string) => DatasetCase[];
  // Prompt
  addPrompt: (prompt: Prompt) => Promise<void>;
  updatePrompt: (prompt: Prompt) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  getPromptsForProject: (projectId: string) => Prompt[];
  // Eval
  addEvalDefinition: (evalDef: EvalDefinition) => Promise<void>;
  updateEvalDefinition: (evalDef: EvalDefinition) => Promise<void>;
  deleteEvalDefinition: (id: string) => Promise<void>;
  getEvalsForProject: (projectId: string) => EvalDefinition[];
  // Run
  addRun: (run: Run) => Promise<void>;
  updateRun: (run: Run) => Promise<void>;
  addRunResults: (results: RunResult[]) => Promise<void>;
  updateRunResult: (result: RunResult) => Promise<void>;
  addEvalResults: (results: EvalResult[]) => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);

  // Load all data from API on mount
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadAllData();
    }
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const projects = await fetch("/api/data/projects").then((r) => r.json());

      const allData: WorkbenchData = {
        projects,
        specVersions: [],
        datasetCases: [],
        prompts: [],
        evalDefinitions: [],
        runs: [],
        runResults: [],
        evalResults: [],
      };

      // Load data for each project
      for (const project of projects) {
        const [specVersions, datasetCases, prompts, evalDefinitions, runs] =
          await Promise.all([
            fetch(`/api/data/spec-versions?projectId=${project.id}`).then((r) =>
              r.json(),
            ),
            fetch(`/api/data/dataset-cases?projectId=${project.id}`).then((r) =>
              r.json(),
            ),
            fetch(`/api/data/prompts?projectId=${project.id}`).then((r) =>
              r.json(),
            ),
            fetch(`/api/data/eval-definitions?projectId=${project.id}`).then(
              (r) => r.json(),
            ),
            fetch(`/api/data/runs?projectId=${project.id}`).then((r) =>
              r.json(),
            ),
          ]);

        allData.specVersions.push(...specVersions);
        allData.datasetCases.push(...datasetCases);
        allData.prompts.push(...prompts);
        allData.evalDefinitions.push(...evalDefinitions);
        allData.runs.push(...runs);

        // Load run results and eval results for each run
        for (const run of runs) {
          const [runResults, evalResults] = await Promise.all([
            fetch(`/api/data/run-results?runId=${run.id}`).then((r) =>
              r.json(),
            ),
            fetch(`/api/data/eval-results?runId=${run.id}`).then((r) =>
              r.json(),
            ),
          ]);

          allData.runResults.push(...runResults);
          allData.evalResults.push(...evalResults);
        }
      }

      dispatch({ type: "SET_DATA", data: allData });
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Project ----
  const createProject = useCallback(async (name: string): Promise<Project> => {
    const response = await fetch("/api/data/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error("Failed to create project");
    }

    const project = await response.json();
    dispatch({ type: "ADD_PROJECT", project });
    return project;
  }, []);

  const updateProject = useCallback(async (project: Project) => {
    const response = await fetch(`/api/data/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: project.name }),
    });

    if (!response.ok) {
      throw new Error("Failed to update project");
    }

    const updatedProject = await response.json();
    dispatch({ type: "UPDATE_PROJECT", project: updatedProject });
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    const response = await fetch(`/api/data/projects/${projectId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete project");
    }

    dispatch({ type: "DELETE_PROJECT", projectId });
  }, []);

  // ---- Spec ----
  const addSpecVersion = useCallback(
    async (
      projectId: string,
      content: SpecContent,
      freeformText: string,
    ): Promise<SpecVersion> => {
      const response = await fetch("/api/data/spec-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, content, freeformText }),
      });

      if (!response.ok) {
        throw new Error("Failed to create spec version");
      }

      const specVersion = await response.json();
      dispatch({ type: "ADD_SPEC_VERSION", specVersion });
      return specVersion;
    },
    [],
  );

  const updateSpecVersion = useCallback(async (sv: SpecVersion) => {
    const response = await fetch(`/api/data/spec-versions/${sv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: sv.status,
        content: sv.content,
        freeformText: sv.freeformText,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update spec version");
    }

    const updatedSpecVersion = await response.json();
    dispatch({ type: "UPDATE_SPEC_VERSION", specVersion: updatedSpecVersion });
  }, []);

  const pinSpecVersion = useCallback(
    async (id: string) => {
      const sv = data.specVersions.find((s) => s.id === id);
      if (!sv) return;

      const response = await fetch(`/api/data/spec-versions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pinned" }),
      });

      if (!response.ok) {
        throw new Error("Failed to pin spec version");
      }

      const updatedSpecVersion = await response.json();
      dispatch({ type: "UPDATE_SPEC_VERSION", specVersion: updatedSpecVersion });

      // The API handles unpinning others, so we need to refetch
      const specVersions = await fetch(
        `/api/data/spec-versions?projectId=${sv.projectId}`,
      ).then((r) => r.json());

      // Update all spec versions for this project
      specVersions.forEach((s: SpecVersion) => {
        if (s.id !== id) {
          dispatch({ type: "UPDATE_SPEC_VERSION", specVersion: s });
        }
      });
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
  const addDatasetCases = useCallback(async (cases: DatasetCase[]) => {
    const response = await fetch("/api/data/dataset-cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cases }),
    });

    if (!response.ok) {
      throw new Error("Failed to create dataset cases");
    }

    const createdCases = await response.json();
    dispatch({ type: "ADD_DATASET_CASES", cases: createdCases });
  }, []);

  const updateDatasetCase = useCallback(async (dc: DatasetCase) => {
    const response = await fetch(`/api/data/dataset-cases/${dc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: dc.input,
        expectedOutput: dc.expectedOutput,
        labels: dc.labels,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update dataset case");
    }

    const updatedCase = await response.json();
    dispatch({ type: "UPDATE_DATASET_CASE", datasetCase: updatedCase });
  }, []);

  const deleteDatasetCase = useCallback(async (id: string) => {
    const response = await fetch(`/api/data/dataset-cases/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete dataset case");
    }

    dispatch({ type: "DELETE_DATASET_CASE", caseId: id });
  }, []);

  const getDatasetForProject = useCallback(
    (projectId: string) =>
      data.datasetCases.filter((d) => d.projectId === projectId),
    [data.datasetCases],
  );

  // ---- Prompt ----
  const addPrompt = useCallback(async (prompt: Prompt) => {
    const response = await fetch("/api/data/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prompt),
    });

    if (!response.ok) {
      throw new Error("Failed to create prompt");
    }

    const createdPrompt = await response.json();
    dispatch({ type: "ADD_PROMPT", prompt: createdPrompt });
  }, []);

  const updatePrompt = useCallback(async (prompt: Prompt) => {
    const response = await fetch(`/api/data/prompts/${prompt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: prompt.name, content: prompt.content }),
    });

    if (!response.ok) {
      throw new Error("Failed to update prompt");
    }

    const updatedPrompt = await response.json();
    dispatch({ type: "UPDATE_PROMPT", prompt: updatedPrompt });
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    const response = await fetch(`/api/data/prompts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete prompt");
    }

    dispatch({ type: "DELETE_PROMPT", promptId: id });
  }, []);

  const getPromptsForProject = useCallback(
    (projectId: string) =>
      data.prompts
        .filter((p) => p.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.prompts],
  );

  // ---- Eval ----
  const addEvalDefinition = useCallback(async (evalDef: EvalDefinition) => {
    const response = await fetch("/api/data/eval-definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evalDef),
    });

    if (!response.ok) {
      throw new Error("Failed to create eval definition");
    }

    const createdEval = await response.json();
    dispatch({ type: "ADD_EVAL_DEFINITION", evalDef: createdEval });
  }, []);

  const updateEvalDefinition = useCallback(async (evalDef: EvalDefinition) => {
    const response = await fetch(`/api/data/eval-definitions/${evalDef.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: evalDef.name,
        description: evalDef.description,
        scoreMode: evalDef.scoreMode,
        judgeInstruction: evalDef.judgeInstruction,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update eval definition");
    }

    const updatedEval = await response.json();
    dispatch({ type: "UPDATE_EVAL_DEFINITION", evalDef: updatedEval });
  }, []);

  const deleteEvalDefinition = useCallback(async (id: string) => {
    const response = await fetch(`/api/data/eval-definitions/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete eval definition");
    }

    dispatch({ type: "DELETE_EVAL_DEFINITION", evalId: id });
  }, []);

  const getEvalsForProject = useCallback(
    (projectId: string) =>
      data.evalDefinitions.filter((e) => e.projectId === projectId),
    [data.evalDefinitions],
  );

  // ---- Run ----
  const addRun = useCallback(async (run: Run) => {
    const response = await fetch("/api/data/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(run),
    });

    if (!response.ok) {
      throw new Error("Failed to create run");
    }

    const createdRun = await response.json();
    dispatch({ type: "ADD_RUN", run: createdRun });
  }, []);

  const updateRun = useCallback(async (run: Run) => {
    const response = await fetch(`/api/data/runs/${run.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: run.status, label: run.label }),
    });

    if (!response.ok) {
      throw new Error("Failed to update run");
    }

    const updatedRun = await response.json();
    dispatch({ type: "UPDATE_RUN", run: updatedRun });
  }, []);

  const addRunResults = useCallback(async (results: RunResult[]) => {
    const response = await fetch("/api/data/run-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results }),
    });

    if (!response.ok) {
      throw new Error("Failed to create run results");
    }

    const createdResults = await response.json();
    dispatch({ type: "ADD_RUN_RESULTS", results: createdResults });
  }, []);

  const updateRunResult = useCallback(async (result: RunResult) => {
    const response = await fetch(`/api/data/run-results/${result.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output: result.output, labels: result.labels }),
    });

    if (!response.ok) {
      throw new Error("Failed to update run result");
    }

    const updatedResult = await response.json();
    dispatch({ type: "UPDATE_RUN_RESULT", result: updatedResult });
  }, []);

  const addEvalResults = useCallback(async (results: EvalResult[]) => {
    const response = await fetch("/api/data/eval-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results }),
    });

    if (!response.ok) {
      throw new Error("Failed to create eval results");
    }

    const createdResults = await response.json();
    dispatch({ type: "ADD_EVAL_RESULTS", results: createdResults });
  }, []);

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
    isLoading,
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
