import type { ArchitectureGraph } from "../types";
import { dedupeOntologyGraph } from "./ontologyGraphDisplay";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** GEXF 1.3 — opens in Gephi, Cytoscape, and other graph tools. */
export function serializeOntologyGexf(graph: ArchitectureGraph): string {
  const normalized = dedupeOntologyGraph(graph);
  const objectIds = new Set(
    normalized.nodes.filter((n) => n.type === "objectType").map((n) => n.id),
  );

  const nodes = normalized.nodes.filter((n) => objectIds.has(n.id));
  const edges = normalized.edges.filter(
    (e) => objectIds.has(e.source) && objectIds.has(e.target),
  );

  const nodeLines = nodes
    .map(
      (n) =>
        `      <node id="${escapeXml(n.id)}" label="${escapeXml(n.data.label)}">` +
        `<attvalues>` +
        (n.data.foundryLink
          ? `<attvalue for="foundryLink" value="${escapeXml(String(n.data.foundryLink))}"/>`
          : "") +
        `</attvalues></node>`,
    )
    .join("\n");

  const edgeLines = edges
    .map((e) => {
      const label = e.label ? ` label="${escapeXml(e.label)}"` : "";
      return `      <edge id="${escapeXml(e.id)}" source="${escapeXml(e.source)}" target="${escapeXml(e.target)}"${label}/>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.3" version="1.3">
  <meta lastmodifieddate="${new Date().toISOString().slice(0, 10)}">
    <creator>Foundry Engagement Kit</creator>
    <description>Foundry ontology object types and link types</description>
  </meta>
  <graph mode="static" defaultedgetype="directed">
    <attributes class="node">
      <attribute id="foundryLink" title="Foundry link" type="string"/>
    </attributes>
    <nodes>
${nodeLines}
    </nodes>
    <edges>
${edgeLines}
    </edges>
  </graph>
</gexf>`;
}

export function gexfToBytes(content: string): number[] {
  return [...new TextEncoder().encode(content)];
}
