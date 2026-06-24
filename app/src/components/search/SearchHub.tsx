import { Filter, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ProjectMeta, SearchHit } from "../../types";

interface SearchHubProps {
  projects: ProjectMeta[];
  onOpenPath: (path: string) => void;
}

export function SearchHub({ projects, onOpenPath }: SearchHubProps) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async () => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const hits = await api.searchWorkspace(
        query.trim(),
        projectFilter || undefined,
        categoryFilter || undefined,
      );
      setResults(hits);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, projectFilter, categoryFilter]);

  useEffect(() => {
    const t = setTimeout(runSearch, 250);
    return () => clearTimeout(t);
  }, [runSearch]);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <Search size={24} className="text-brand-500" />
          <div>
            <h2 className="text-2xl font-bold text-fg-primary">Search workspace</h2>
            <p className="text-sm text-fg-secondary">
              Full-text search across daily, weekly, project, and reference files
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markdown, JSON, and text files…"
              className="w-full rounded-xl border border-surface-border-strong bg-surface-input py-2.5 pl-10 pr-4 text-sm text-fg-primary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
              autoFocus
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Filter size={14} className="text-fg-muted" />
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-surface-border-strong bg-surface-input px-3 py-1.5 text-sm text-fg-body"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.display_name}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-surface-border-strong bg-surface-input px-3 py-1.5 text-sm text-fg-body"
          >
            <option value="">All categories</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="project">Project</option>
            <option value="reference">Reference</option>
          </select>
        </div>

        <div className="mt-8">
          {query.trim().length < 2 ? (
            <p className="text-sm text-fg-muted">Type at least 2 characters to search.</p>
          ) : loading ? (
            <p className="text-sm text-fg-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-fg-muted">No matches for "{query}".</p>
          ) : (
            <ul className="space-y-2">
              {results.map((hit) => (
                <li key={hit.path}>
                  <button
                    onClick={() => onOpenPath(hit.path)}
                    className="card-kit-interactive w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-fg-primary">{hit.name}</p>
                        <p className="mt-0.5 truncate font-mono text-xs text-fg-muted">{hit.path}</p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-fg-faint">
                        <span className="rounded bg-surface-elevated px-2 py-0.5">{hit.category}</span>
                        {hit.project && (
                          <p className="mt-1 text-fg-muted">{hit.project}</p>
                        )}
                      </div>
                    </div>
                    {hit.snippet && (
                      <p className="mt-2 text-sm text-fg-secondary">{hit.snippet}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
