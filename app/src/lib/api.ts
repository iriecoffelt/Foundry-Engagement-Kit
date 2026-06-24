import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, ProjectMeta } from "../types";

export const api = {
  getWorkspaceRoot: () => invoke<string>("get_workspace_root"),
  setWorkspaceRoot: (path: string) => invoke<void>("set_workspace_root", { path }),
  listDirectory: (relative: string, recursive = false) =>
    invoke<FileEntry[]>("list_directory", { relative, recursive }),
  readFile: (relative: string) => invoke<string>("read_file", { relative }),
  writeFile: (relative: string, content: string) =>
    invoke<void>("write_file", { relative, content }),
  deletePath: (relative: string) => invoke<void>("delete_path", { relative }),
  createDirectory: (relative: string) => invoke<void>("create_directory", { relative }),
  createFile: (relative: string, content: string) =>
    invoke<void>("create_file", { relative, content }),
  listProjects: () => invoke<FileEntry[]>("list_projects"),
  listProjectsWithMeta: () => invoke<ProjectMeta[]>("list_projects_with_meta"),
  createProject: (name: string) => invoke<string>("create_project", { name }),
  createDatedEntry: (category: string, templateName: string) =>
    invoke<string>("create_dated_entry", { category, templateName }),
  searchFiles: (query: string) => invoke<FileEntry[]>("search_files", { query }),
  importFile: (sourcePath: string, destRelative: string) =>
    invoke<string>("import_file", { sourcePath, destRelative }),
  readJson: <T>(relative: string) => invoke<T>("read_json", { relative }),
  writeJson: (relative: string, data: unknown) =>
    invoke<void>("write_json", { relative, data }),
  resolveAbsolutePath: (relative: string) =>
    invoke<string>("resolve_absolute_path", { relative }),
  openPath: (relative: string) => invoke<void>("open_path_with_system", { relative }),
  setupEngagementProject: (
    slug: string,
    engagementJson: unknown,
    readme: string,
    discovery: string,
    scoping: string,
  ) =>
    invoke<string>("setup_engagement_project", {
      slug,
      engagementJson,
      readme,
      discovery,
      scoping,
    }),
  exportProjectReport: (projectPath: string, format: "pdf" | "docx", destPath: string) =>
    invoke<void>("export_project_report", { projectPath, format, destPath }),
  cloneProject: (sourcePath: string, newName: string) =>
    invoke<string>("clone_project", { sourcePath, newName }),
  writeBinary: (relative: string, bytes: number[]) =>
    invoke<void>("write_binary", { relative, bytes }),
  writeBytesAbsolute: (destPath: string, bytes: number[]) =>
    invoke<void>("write_bytes_absolute", { destPath, bytes }),
};
