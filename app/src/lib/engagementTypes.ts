export type EngagementType = 'greenfield' | 'migration' | 'enhancement' | 'enablement';

export interface SuggestedMilestone {
  name: string;
  description: string;
}

export interface EngagementTypeConfig {
  id: EngagementType;
  label: string;
  description: string;
  emphasizedPhases: string[];
  optionalPhases: string[];
  checklistOverrides: Record<string, boolean>;
  suggestedMilestones: SuggestedMilestone[];
}

export const ENGAGEMENT_TYPES: EngagementTypeConfig[] = [
  {
    id: 'greenfield',
    label: 'Greenfield implementation',
    description: 'New Foundry deployment with full discovery and ontology design',
    emphasizedPhases: ['discovery', 'scoping', 'design'],
    optionalPhases: [],
    checklistOverrides: {},
    suggestedMilestones: [
      { name: 'M0 - Kickoff', description: 'Project initiated, team aligned' },
      { name: 'M1 - Discovery Complete', description: 'Requirements gathered, data sources identified' },
      { name: 'M2 - Ontology Approved', description: 'Object types and relationships finalized' },
      { name: 'M3 - MVP Live', description: 'Core workflows operational' },
      { name: 'M4 - UAT Complete', description: 'User acceptance testing passed' },
      { name: 'M5 - Handoff', description: 'Customer owns and operates' },
    ],
  },
  {
    id: 'migration',
    label: 'Data migration',
    description: 'Moving existing systems/data into Foundry',
    emphasizedPhases: ['scoping', 'build', 'deploy'],
    optionalPhases: ['discovery'],
    checklistOverrides: { 'data-mapping-complete': false, 'parallel-run-validated': false },
    suggestedMilestones: [
      { name: 'M0 - Kickoff', description: 'Migration scope defined' },
      { name: 'M1 - Mapping Complete', description: 'Source-to-target mapping finalized' },
      { name: 'M2 - Pipeline Built', description: 'ETL/sync pipelines operational' },
      { name: 'M3 - Parallel Run', description: 'Old and new systems running in parallel' },
      { name: 'M4 - Cutover', description: 'Production switch to Foundry' },
      { name: 'M5 - Decommission', description: 'Legacy system retired' },
    ],
  },
  {
    id: 'enhancement',
    label: 'Enhancement / add-on',
    description: 'Adding features to existing Foundry deployment',
    emphasizedPhases: ['scoping', 'build'],
    optionalPhases: ['discovery', 'handoff'],
    checklistOverrides: {},
    suggestedMilestones: [
      { name: 'M0 - Scope Agreed', description: 'Enhancement requirements confirmed' },
      { name: 'M1 - Design Approved', description: 'Technical approach signed off' },
      { name: 'M2 - Deployed', description: 'Changes live in production' },
      { name: 'M3 - Validated', description: 'Customer confirms working as expected' },
    ],
  },
  {
    id: 'enablement',
    label: 'Training & enablement',
    description: 'Workshops and documentation for customer self-service',
    emphasizedPhases: ['discovery', 'handoff'],
    optionalPhases: ['build', 'deploy'],
    checklistOverrides: { 'training-materials-ready': false, 'workshops-scheduled': false },
    suggestedMilestones: [
      { name: 'M0 - Needs Assessment', description: 'Training gaps identified' },
      { name: 'M1 - Materials Ready', description: 'Workshops and docs prepared' },
      { name: 'M2 - Training Delivered', description: 'All sessions completed' },
      { name: 'M3 - Certification', description: 'Customer team certified/capable' },
    ],
  },
];

export function getEngagementTypeConfig(type: EngagementType | undefined): EngagementTypeConfig {
  if (!type) return ENGAGEMENT_TYPES[0];
  return ENGAGEMENT_TYPES.find(t => t.id === type) || ENGAGEMENT_TYPES[0];
}

export function isEmphasizedPhase(type: EngagementType | undefined, phase: string): boolean {
  const config = getEngagementTypeConfig(type);
  return config.emphasizedPhases.includes(phase);
}

export function isOptionalPhase(type: EngagementType | undefined, phase: string): boolean {
  const config = getEngagementTypeConfig(type);
  return config.optionalPhases.includes(phase);
}

export const ENGAGEMENT_TYPE_COLORS: Record<EngagementType, string> = {
  greenfield: 'emerald',
  migration: 'amber',
  enhancement: 'sky',
  enablement: 'violet',
};
