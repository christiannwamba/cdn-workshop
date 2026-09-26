export type RequirementStatus = 'supported' | 'workaround' | 'partial' | 'gap';
export interface DeploymentProfile {
  environment: string;
  siteUrl: string;
  requestUrl: string;
  collectorUrl: string;
  repo: string;
  revision: string;
  dashboard: string;
  team: string;
  projects: Record<'web' | 'request' | 'collector', string>;
  fixtures: Record<'platformGaps' | 'cache', { url: string }>;
  sources: Record<string, { path: string; first: number; last: number }>;
}
export interface Requirement {
  id: string;
  title: string;
  category: string;
  status: RequirementStatus;
  implemented: boolean;
}
