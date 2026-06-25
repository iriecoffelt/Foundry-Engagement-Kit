import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { api } from "../../lib/api";
import { loadPhaseChecklist, subscribeChecklistSaved } from "../../lib/checklistData";
import {
  DEFAULT_CHECKLIST,
  type PhaseChecklist,
} from "../../lib/phaseChecklist";
import type { FileEntry } from "../../types";

interface ProjectDataContextValue {
  projectPath: string;
  checklist: PhaseChecklist | null;
  setChecklist: Dispatch<SetStateAction<PhaseChecklist | null>>;
  uploads: FileEntry[];
  docTree: FileEntry[];
  docTreeLoaded: boolean;
  loadDocTree: () => Promise<FileEntry[]>;
  reloadDocTree: () => Promise<FileEntry[]>;
  refreshUploads: () => Promise<void>;
}

const ProjectDataContext = createContext<ProjectDataContextValue | null>(null);

export function ProjectDataProvider({
  projectPath,
  children,
}: {
  projectPath: string;
  children: ReactNode;
}) {
  const [checklist, setChecklist] = useState<PhaseChecklist | null>(null);
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [docTree, setDocTree] = useState<FileEntry[]>([]);
  const [docTreeLoaded, setDocTreeLoaded] = useState(false);

  const refreshUploads = useCallback(async () => {
    try {
      await api.createDirectory(`${projectPath}/references`);
      const refs = await api.listDirectory(`${projectPath}/references`, false);
      setUploads(refs.filter((e) => !e.is_dir));
    } catch {
      setUploads([]);
    }
  }, [projectPath]);

  const reloadDocTree = useCallback(async () => {
    const tree = await api.listDirectory(projectPath, true);
    setDocTree(tree);
    setDocTreeLoaded(true);
    return tree;
  }, [projectPath]);

  const loadDocTree = useCallback(async () => {
    if (docTreeLoaded) return docTree;
    return reloadDocTree();
  }, [docTreeLoaded, docTree, reloadDocTree]);

  useEffect(() => {
    setChecklist(null);
    setDocTree([]);
    setDocTreeLoaded(false);
    (async () => {
      try {
        setChecklist(await loadPhaseChecklist(projectPath));
      } catch {
        setChecklist(structuredClone(DEFAULT_CHECKLIST));
      }
      await refreshUploads();
    })();
  }, [projectPath, refreshUploads]);

  useEffect(() => {
    return subscribeChecklistSaved((path, data) => {
      if (path === projectPath) setChecklist(data);
    });
  }, [projectPath]);

  const value = useMemo(
    () => ({
      projectPath,
      checklist,
      setChecklist,
      uploads,
      docTree,
      docTreeLoaded,
      loadDocTree,
      reloadDocTree,
      refreshUploads,
    }),
    [projectPath, checklist, uploads, docTree, docTreeLoaded, loadDocTree, reloadDocTree, refreshUploads],
  );

  return <ProjectDataContext.Provider value={value}>{children}</ProjectDataContext.Provider>;
}

export function useProjectData(): ProjectDataContextValue {
  const ctx = useContext(ProjectDataContext);
  if (!ctx) throw new Error("useProjectData must be used within ProjectDataProvider");
  return ctx;
}

export function useProjectDataOptional(): ProjectDataContextValue | null {
  return useContext(ProjectDataContext);
}
