import * as rules from './rules.js';
import { env } from '../config/env.js';
// Provider contract is intentionally read-only. Mutations use normal authorized services.
const providers = {
  rules: {
    version: rules.VERSION,
    assignment: rules.assignmentCandidates,
    health: rules.healthFor,
    workload: rules.workloadFor,
    performance: rules.performanceFor,
    leaveImpact: rules.leaveImpactFor
  }
};
export const intelligenceProvider = () => providers[env.AI_PROVIDER];
