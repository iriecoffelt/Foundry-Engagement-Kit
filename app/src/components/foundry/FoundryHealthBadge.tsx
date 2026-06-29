import { AlertCircle, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { loadFoundryConnection } from "../../lib/foundryConnection";
import { createFoundryClient } from "../../lib/foundryApi";
import type { FoundryHealthCheckReport } from "../../lib/foundryTypes";

interface FoundryHealthBadgeProps {
  projectPath: string;
  datasetRid?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

type HealthStatus = "loading" | "passing" | "failing" | "unknown" | "disconnected";

export function FoundryHealthBadge({
  projectPath,
  datasetRid,
  showLabel = true,
  size = "sm",
}: FoundryHealthBadgeProps) {
  const [status, setStatus] = useState<HealthStatus>("loading");
  const [reports, setReports] = useState<FoundryHealthCheckReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!datasetRid) {
      setStatus("disconnected");
      return;
    }

    try {
      const conn = await loadFoundryConnection(projectPath);
      if (!conn?.token) {
        setStatus("disconnected");
        return;
      }

      const client = createFoundryClient(conn);
      const result = await client.getDatasetHealthReports(datasetRid);
      setReports(result.data);

      // Determine overall status
      const hasFailure = result.data.some((r) => r.status === "FAILING");
      const allPassing = result.data.every((r) => r.status === "PASSING");

      if (result.data.length === 0) {
        setStatus("unknown");
      } else if (hasFailure) {
        setStatus("failing");
      } else if (allPassing) {
        setStatus("passing");
      } else {
        setStatus("unknown");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load health");
      setStatus("unknown");
    }
  }, [projectPath, datasetRid]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const iconSize = size === "sm" ? 12 : 16;

  if (status === "disconnected" || !datasetRid) {
    return null;
  }

  const statusConfig: Record<
    HealthStatus,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    loading: {
      icon: <Loader2 size={iconSize} className="animate-spin" />,
      label: "Loading…",
      className: "text-fg-muted",
    },
    passing: {
      icon: <CheckCircle2 size={iconSize} />,
      label: "Healthy",
      className: "text-green-400",
    },
    failing: {
      icon: <AlertCircle size={iconSize} />,
      label: "Failing",
      className: "text-red-400",
    },
    unknown: {
      icon: <HelpCircle size={iconSize} />,
      label: "Unknown",
      className: "text-fg-muted",
    },
    disconnected: {
      icon: null,
      label: "",
      className: "",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-1 ${config.className}`}
      title={
        error ||
        (reports.length > 0
          ? `${reports.filter((r) => r.status === "PASSING").length}/${reports.length} checks passing`
          : "No health checks configured")
      }
    >
      {config.icon}
      {showLabel && <span className="text-xs">{config.label}</span>}
    </div>
  );
}

interface FoundryHealthSummaryProps {
  projectPath: string;
  datasetRids: string[];
}

export function FoundryHealthSummary({
  projectPath,
  datasetRids,
}: FoundryHealthSummaryProps) {
  const [summary, setSummary] = useState<{
    total: number;
    passing: number;
    failing: number;
  }>({ total: 0, passing: 0, failing: 0 });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (datasetRids.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const conn = await loadFoundryConnection(projectPath);
      if (!conn?.token) {
        setLoading(false);
        return;
      }

      const client = createFoundryClient(conn);
      let passing = 0;
      let failing = 0;
      let total = 0;

      for (const rid of datasetRids) {
        try {
          const result = await client.getDatasetHealthReports(rid);
          for (const report of result.data) {
            total++;
            if (report.status === "PASSING") passing++;
            if (report.status === "FAILING") failing++;
          }
        } catch {
          // Skip datasets that fail to load
        }
      }

      setSummary({ total, passing, failing });
    } catch {
      // Ignore errors
    } finally {
      setLoading(false);
    }
  }, [projectPath, datasetRids]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
        <Loader2 size={12} className="animate-spin" /> Loading health…
      </span>
    );
  }

  if (summary.total === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      {summary.passing > 0 && (
        <span className="inline-flex items-center gap-1 text-green-400">
          <CheckCircle2 size={12} /> {summary.passing} passing
        </span>
      )}
      {summary.failing > 0 && (
        <span className="inline-flex items-center gap-1 text-red-400">
          <AlertCircle size={12} /> {summary.failing} failing
        </span>
      )}
    </div>
  );
}
