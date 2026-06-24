import { open } from "@tauri-apps/plugin-dialog";
import { BookOpen, Library, Tags, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { FileEntry } from "../../types";
import { Editor } from "../Editor";
import {
  HubEmpty,
  HubItem,
  HubLayout,
  HubMain,
  HubSection,
  HubSidebar,
} from "../layout/HubLayout";
import { ArchitectureNodeTypesEditor } from "./ArchitectureNodeTypesEditor";
import { DeliveryTypesEditor } from "./DeliveryTypesEditor";
import { OntologyElementTypesEditor } from "./OntologyElementTypesEditor";
import { FoundryAreasEditor } from "./FoundryAreasEditor";
import { OrganizationsEditor } from "./OrganizationsEditor";
import { RolesEditor } from "./RolesEditor";

type LibraryPanel =
  | "none"
  | "roles"
  | "foundry-areas"
  | "organizations"
  | "delivery-types"
  | "architecture-node-types"
  | "ontology-element-types"
  | "guide";

export function LibraryHub() {
  const [guides, setGuides] = useState<FileEntry[]>([]);
  const [uploads, setUploads] = useState<FileEntry[]>([]);
  const [openFile, setOpenFile] = useState<{
    path: string;
    content: string;
    dirty: boolean;
  } | null>(null);
  const [status, setStatus] = useState("");
  const [panel, setPanel] = useState<LibraryPanel>("none");

  const refresh = useCallback(async () => {
    const ref = await api.listDirectory("reference", false);
    setGuides(ref.filter((f) => f.name.endsWith(".md")));
    try {
      await api.createDirectory("reference/uploads");
      const up = await api.listDirectory("reference/uploads", false);
      setUploads(up.filter((f) => !f.is_dir));
    } catch {
      setUploads([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openGuide = async (path: string) => {
    setPanel("guide");
    const content = await api.readFile(path);
    setOpenFile({ path, content, dirty: false });
  };

  const upload = async () => {
    const selected = await open({ multiple: false });
    if (!selected) return;
    try {
      await api.createDirectory("reference/uploads");
      await api.importFile(selected, "reference/uploads/");
      setStatus("File uploaded");
      refresh();
    } catch (e) {
      setStatus(String(e));
    }
  };

  return (
    <HubLayout>
      <HubSidebar title="Library" subtitle="Guides, reference lists, and uploads">
        <HubSection label="Reference lists" icon={Tags}>
          <HubItem
            selected={panel === "roles"}
            onClick={() => {
              setPanel("roles");
              setOpenFile(null);
            }}
          >
            Engagement roles
          </HubItem>
          <HubItem
            selected={panel === "foundry-areas"}
            onClick={() => {
              setPanel("foundry-areas");
              setOpenFile(null);
            }}
          >
            Foundry areas
          </HubItem>
          <HubItem
            selected={panel === "organizations"}
            onClick={() => {
              setPanel("organizations");
              setOpenFile(null);
            }}
          >
            Organizations
          </HubItem>
          <HubItem
            selected={panel === "delivery-types"}
            onClick={() => {
              setPanel("delivery-types");
              setOpenFile(null);
            }}
          >
            Delivery types
          </HubItem>
          <HubItem
            selected={panel === "architecture-node-types"}
            onClick={() => {
              setPanel("architecture-node-types");
              setOpenFile(null);
            }}
          >
            Architecture node types
          </HubItem>
          <HubItem
            selected={panel === "ontology-element-types"}
            onClick={() => {
              setPanel("ontology-element-types");
              setOpenFile(null);
            }}
          >
            Ontology element types
          </HubItem>
        </HubSection>

        <HubSection
          label="Guides"
          icon={BookOpen}
        >
          {guides.length === 0 ? (
            <p className="px-3 py-1.5 text-xs text-fg-faint">No guides in reference/</p>
          ) : (
            guides.map((g) => (
              <HubItem
                key={g.path}
                selected={openFile?.path === g.path}
                onClick={() => openGuide(g.path)}
              >
                {g.name.replace(".md", "").replace(/-/g, " ")}
              </HubItem>
            ))
          )}
        </HubSection>

        <HubSection
          label="Uploads"
          icon={Upload}
          action={
            <button
              onClick={upload}
              className="text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              Upload
            </button>
          }
        >
          {status && <p className="px-3 pb-1 text-xs text-fg-muted">{status}</p>}
          {uploads.length === 0 ? (
            <p className="px-3 py-1.5 text-xs text-fg-faint">No uploads yet</p>
          ) : (
            uploads.map((u) => (
              <HubItem key={u.path} onClick={() => api.openPath(u.path)}>
                {u.name}
              </HubItem>
            ))
          )}
        </HubSection>
      </HubSidebar>

      <HubMain>
        {panel === "roles" ? (
          <RolesEditor
            onStatus={(msg) => {
              setStatus(msg);
              setTimeout(() => setStatus(""), 2500);
            }}
          />
        ) : panel === "foundry-areas" ? (
          <FoundryAreasEditor
            onStatus={(msg) => {
              setStatus(msg);
              setTimeout(() => setStatus(""), 2500);
            }}
          />
        ) : panel === "organizations" ? (
          <OrganizationsEditor
            onStatus={(msg) => {
              setStatus(msg);
              setTimeout(() => setStatus(""), 2500);
            }}
          />
        ) : panel === "delivery-types" ? (
          <DeliveryTypesEditor
            onStatus={(msg) => {
              setStatus(msg);
              setTimeout(() => setStatus(""), 2500);
            }}
          />
        ) : panel === "architecture-node-types" ? (
          <ArchitectureNodeTypesEditor
            onStatus={(msg) => {
              setStatus(msg);
              setTimeout(() => setStatus(""), 2500);
            }}
          />
        ) : panel === "ontology-element-types" ? (
          <OntologyElementTypesEditor
            onStatus={(msg) => {
              setStatus(msg);
              setTimeout(() => setStatus(""), 2500);
            }}
          />
        ) : openFile ? (
          <div className="flex h-full min-h-0 flex-col">
            <Editor
              path={openFile.path}
              content={openFile.content}
              dirty={openFile.dirty}
              defaultView="split"
              onChange={(content) => setOpenFile({ ...openFile, content, dirty: true })}
              onSave={async () => {
                await api.writeFile(openFile.path, openFile.content);
                setOpenFile({ ...openFile, dirty: false });
              }}
              onDelete={async () => {
                if (!confirm(`Delete ${openFile.path}?`)) return;
                await api.deletePath(openFile.path);
                setOpenFile(null);
                refresh();
              }}
            />
          </div>
        ) : (
          <HubEmpty
            icon={Library}
            title="Select a guide or reference list"
            description="Edit reference guides, manage shared lists, or upload files."
          />
        )}
      </HubMain>
    </HubLayout>
  );
}
