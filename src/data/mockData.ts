export interface Requirement {
  id: string;
  title: string;
  type: 'checkbox' | 'slider';
  weight: number;
  mandatory: boolean;
  value: number; // 0 or 1 for checkbox, 0-1 for slider
  completedAt?: string;
  completedBy?: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  precisionTime?: string; // Optional HH:mm for tasks that require exact timing
  requirements: Requirement[];
  status: 'pending' | 'in-progress' | 'done' | 'overdue';
  completedAt?: string;
  photoEvidence?: string;
  note?: string;
}

export interface Timeframe {
  id: string;
  label: string;
  startTime: string; // HH:mm
  endTime: string;
  works: Work[];
  status: 'upcoming' | 'active' | 'completed' | 'overdue';
}

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  role: 'worker' | 'team-lead' | 'admin';
}

export const employees: Employee[] = [
  { id: '1', name: 'Yuki T.', avatar: 'YT', role: 'worker' },
  { id: '2', name: 'Marcus R.', avatar: 'MR', role: 'worker' },
  { id: '3', name: 'Linh N.', avatar: 'LN', role: 'worker' },
  { id: '4', name: 'Sarah K.', avatar: 'SK', role: 'team-lead' },
  { id: '5', name: 'Dev P.', avatar: 'DP', role: 'worker' },
];

export const currentUser = employees[0];

function makeReqs(items: Array<{ title: string; type: 'checkbox' | 'slider'; done?: number }>): Requirement[] {
  return items.map((r, i) => ({
    id: `req-${i}-${Date.now()}`,
    title: r.title,
    type: r.type,
    weight: 1,
    mandatory: true,
    value: r.done ?? 0,
    ...(r.done ? { completedAt: new Date().toISOString(), completedBy: '1' } : {}),
  }));
}

export const timeframes: Timeframe[] = [
  {
    id: 'tf-1',
    label: 'Morning Kickoff',
    startTime: '09:00',
    endTime: '10:00',
    status: 'completed',
    works: [
      {
        id: 'w-1',
        title: 'Safety Briefing',
        description: 'Complete morning safety walkthrough and verify all stations are operational.',
        assignees: ['1', '2'],
        precisionTime: '09:10',
        status: 'done',
        completedAt: new Date().toISOString(),
        requirements: makeReqs([
          { title: 'Check fire exits clear', type: 'checkbox', done: 1 },
          { title: 'Verify equipment status', type: 'checkbox', done: 1 },
          { title: 'Sign attendance log', type: 'checkbox', done: 1 },
        ]),
      },
      {
        id: 'w-2',
        title: 'Daily Targets Sync',
        description: 'Align staffing targets and floor responsibilities for the day.',
        assignees: ['1', '4'],
        status: 'done',
        completedAt: new Date().toISOString(),
        requirements: makeReqs([
          { title: 'Review KPI board', type: 'checkbox', done: 1 },
          { title: 'Confirm role assignments', type: 'checkbox', done: 1 },
          { title: 'Confidence score', type: 'slider', done: 0.9 },
        ]),
      },
      {
        id: 'w-3',
        title: 'Inbound Shipment Triage',
        description: 'Prioritize urgent inbound boxes and assign receiving docks.',
        assignees: ['1', '3'],
        precisionTime: '09:42',
        status: 'in-progress',
        requirements: makeReqs([
          { title: 'Tag high-priority items', type: 'checkbox', done: 1 },
          { title: 'Allocate dock lanes', type: 'checkbox' },
          { title: 'Coverage quality', type: 'slider', done: 0.6 },
        ]),
      },
      {
        id: 'w-4',
        title: 'Opening Floor Readiness',
        description: 'Confirm displays, labels, and customer zones are open-ready.',
        assignees: ['1', '5'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Signage check', type: 'checkbox' },
          { title: 'Restock high-turn SKUs', type: 'checkbox' },
          { title: 'Readiness score', type: 'slider' },
        ]),
      },
    ],
  },
  {
    id: 'tf-2',
    label: 'Deep Work 1',
    startTime: '10:00',
    endTime: '11:00',
    status: 'active',
    works: [
      {
        id: 'w-5',
        title: 'Inventory Audit - Zone A',
        description: 'Count and verify all items in Zone A against the master inventory sheet. Report discrepancies.',
        assignees: ['1', '3'],
        precisionTime: '10:12',
        status: 'in-progress',
        requirements: makeReqs([
          { title: 'Scan all shelf barcodes', type: 'checkbox' },
          { title: 'Count accuracy', type: 'slider' },
          { title: 'Photo evidence of discrepancies', type: 'checkbox' },
        ]),
      },
      {
        id: 'w-6',
        title: 'Client Report Draft',
        description: 'Prepare weekly performance summary for client review meeting at 14:00.',
        assignees: ['1'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Data compiled', type: 'checkbox' },
          { title: 'Charts generated', type: 'checkbox' },
          { title: 'Review completeness', type: 'slider' },
        ]),
      },
      {
        id: 'w-7',
        title: 'Vendor Follow-up Calls',
        description: 'Call delayed vendors and capture confirmed ETAs in tracker.',
        assignees: ['1', '4'],
        precisionTime: '10:35',
        status: 'in-progress',
        requirements: makeReqs([
          { title: 'Call top 5 vendors', type: 'checkbox', done: 1 },
          { title: 'Update ETA sheet', type: 'checkbox' },
          { title: 'Resolution confidence', type: 'slider', done: 0.4 },
        ]),
      },
      {
        id: 'w-8',
        title: 'Queue Optimization',
        description: 'Reduce handoff wait time by balancing active work queues.',
        assignees: ['1', '2', '5'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Detect bottleneck lane', type: 'checkbox' },
          { title: 'Reassign one support role', type: 'checkbox' },
          { title: 'Throughput score', type: 'slider' },
        ]),
      },
    ],
  },
  {
    id: 'tf-3',
    label: 'Deep Work 2',
    startTime: '11:00',
    endTime: '12:00',
    status: 'upcoming',
    works: [
      {
        id: 'w-9',
        title: 'Process Optimization Review',
        description: 'Analyze bottlenecks in the packaging line and propose 3 improvements.',
        assignees: ['1', '2', '5'],
        precisionTime: '11:08',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Identify top 3 bottlenecks', type: 'checkbox' },
          { title: 'Draft improvement proposals', type: 'checkbox' },
          { title: 'Implementation feasibility', type: 'slider' },
        ]),
      },
      {
        id: 'w-10',
        title: 'Returns Validation Sweep',
        description: 'Verify returned items meet condition policy and relabel stock.',
        assignees: ['1', '3'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Inspect return bins', type: 'checkbox' },
          { title: 'Flag damaged units', type: 'checkbox' },
          { title: 'Validation quality', type: 'slider' },
        ]),
      },
      {
        id: 'w-11',
        title: 'Cross-team Dependency Check',
        description: 'Confirm dependencies with logistics and customer support teams.',
        assignees: ['1', '4'],
        precisionTime: '11:40',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Send dependency notes', type: 'checkbox' },
          { title: 'Confirm owners', type: 'checkbox' },
          { title: 'Risk score', type: 'slider' },
        ]),
      },
      {
        id: 'w-12',
        title: 'Exception Backlog Cleanup',
        description: 'Triage unresolved exceptions and close quick wins.',
        assignees: ['1', '2'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Sort by severity', type: 'checkbox' },
          { title: 'Close 5 exceptions', type: 'checkbox' },
          { title: 'Coverage completeness', type: 'slider' },
        ]),
      },
    ],
  },
  {
    id: 'tf-4',
    label: 'Afternoon Block',
    startTime: '13:00',
    endTime: '15:00',
    status: 'upcoming',
    works: [
      {
        id: 'w-13',
        title: 'Team Training Session',
        description: 'Lead the new equipment training module for junior team members.',
        assignees: ['1', '2', '3', '5'],
        precisionTime: '13:15',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Presentation prepared', type: 'checkbox' },
          { title: 'Hands-on demo completed', type: 'checkbox' },
          { title: 'Quiz score threshold', type: 'slider' },
          { title: 'Attendance confirmed', type: 'checkbox' },
        ]),
      },
      {
        id: 'w-14',
        title: 'Customer Escalation Drill',
        description: 'Run escalation response drill for priority customer incidents.',
        assignees: ['1', '4'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Scenario walkthrough', type: 'checkbox' },
          { title: 'Response timing check', type: 'slider' },
          { title: 'Post-mortem notes', type: 'checkbox' },
        ]),
      },
      {
        id: 'w-15',
        title: 'Packaging Quality Audit',
        description: 'Sample package quality and document recurring defects.',
        assignees: ['1', '5'],
        precisionTime: '14:20',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Sample 20 packages', type: 'checkbox' },
          { title: 'Log defect types', type: 'checkbox' },
          { title: 'Quality rating', type: 'slider' },
        ]),
      },
      {
        id: 'w-16',
        title: 'Micro-break Schedule Update',
        description: 'Rebalance shift breaks to maintain floor coverage.',
        assignees: ['1', '2', '3'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Check staffing matrix', type: 'checkbox' },
          { title: 'Publish new slots', type: 'checkbox' },
          { title: 'Coverage confidence', type: 'slider' },
        ]),
      },
    ],
  },
  {
    id: 'tf-5',
    label: 'Execution',
    startTime: '15:00',
    endTime: '17:00',
    status: 'upcoming',
    works: [
      {
        id: 'w-17',
        title: 'Priority Orders Fulfillment',
        description: 'Process high-priority orders and verify dispatch quality.',
        assignees: ['1', '2', '5'],
        precisionTime: '15:12',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Pick priority batch', type: 'checkbox' },
          { title: 'Verify packing checklist', type: 'checkbox' },
          { title: 'Dispatch readiness', type: 'slider' },
        ]),
      },
      {
        id: 'w-18',
        title: 'Aisle Replenishment Sprint',
        description: 'Replenish fast-moving aisles before evening demand peak.',
        assignees: ['1', '3'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Refill top 10 SKUs', type: 'checkbox' },
          { title: 'Confirm shelf labels', type: 'checkbox' },
          { title: 'Shelf availability score', type: 'slider' },
        ]),
      },
      {
        id: 'w-19',
        title: 'Fraud Signal Review',
        description: 'Investigate suspicious order flags and escalate if needed.',
        assignees: ['1', '4'],
        precisionTime: '16:10',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Review flagged orders', type: 'checkbox' },
          { title: 'Escalate verified cases', type: 'checkbox' },
          { title: 'Decision confidence', type: 'slider' },
        ]),
      },
      {
        id: 'w-20',
        title: 'Ops Dashboard Refresh',
        description: 'Update dashboard tiles with latest throughput and SLA status.',
        assignees: ['1'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Refresh source sheets', type: 'checkbox' },
          { title: 'Validate trend lines', type: 'checkbox' },
          { title: 'Dashboard quality', type: 'slider' },
        ]),
      },
    ],
  },
  {
    id: 'tf-6',
    label: 'Wrap & Handover',
    startTime: '17:00',
    endTime: '18:00',
    status: 'upcoming',
    works: [
      {
        id: 'w-21',
        title: 'End-of-day Handover Notes',
        description: 'Summarize unresolved tasks and blockers for next shift.',
        assignees: ['1', '4'],
        precisionTime: '17:20',
        status: 'pending',
        requirements: makeReqs([
          { title: 'List open items', type: 'checkbox' },
          { title: 'Assign owners', type: 'checkbox' },
          { title: 'Clarity score', type: 'slider' },
        ]),
      },
      {
        id: 'w-22',
        title: 'Incident Summary Log',
        description: 'Record incidents, mitigations, and follow-up actions.',
        assignees: ['1', '2'],
        precisionTime: '17:35',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Document incident timeline', type: 'checkbox' },
          { title: 'Attach action items', type: 'checkbox' },
          { title: 'Completeness score', type: 'slider' },
        ]),
      },
      {
        id: 'w-23',
        title: 'Clean-up and Reset',
        description: 'Reset work zones and tools for a smooth next-day launch.',
        assignees: ['1', '3', '5'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Reset stations', type: 'checkbox' },
          { title: 'Sanitize shared gear', type: 'checkbox' },
          { title: 'Readiness score', type: 'slider' },
        ]),
      },
      {
        id: 'w-24',
        title: 'Tomorrow Prep Snapshot',
        description: 'Capture top priorities and expected constraints for tomorrow.',
        assignees: ['1'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Top 3 priorities set', type: 'checkbox' },
          { title: 'Risk notes prepared', type: 'checkbox' },
          { title: 'Preparedness score', type: 'slider' },
        ]),
      },
    ],
  },
  {
    id: 'tf-7',
    label: 'Night Precision Block',
    startTime: '21:00',
    endTime: '22:00',
    status: 'upcoming',
    works: [
      {
        id: 'w-25',
        title: 'Placeholder Work 1',
        description: 'Placeholder task details. Replace with actual work instructions.',
        assignees: ['1'],
        precisionTime: '21:05',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Placeholder requirement A', type: 'checkbox' },
          { title: 'Placeholder requirement B', type: 'checkbox' },
          { title: 'Placeholder quality score', type: 'slider' },
        ]),
      },
      {
        id: 'w-26',
        title: 'Placeholder Work 2',
        description: 'Placeholder task details. Replace with actual work instructions.',
        assignees: ['1'],
        precisionTime: '21:10',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Placeholder requirement A', type: 'checkbox' },
          { title: 'Placeholder requirement B', type: 'checkbox' },
          { title: 'Placeholder quality score', type: 'slider' },
        ]),
      },
      {
        id: 'w-27',
        title: 'Placeholder Work 3',
        description: 'Placeholder task details. Replace with actual work instructions.',
        assignees: ['1'],
        precisionTime: '21:20',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Placeholder requirement A', type: 'checkbox' },
          { title: 'Placeholder requirement B', type: 'checkbox' },
          { title: 'Placeholder quality score', type: 'slider' },
        ]),
      },
      {
        id: 'w-28',
        title: 'Placeholder Work 4',
        description: 'Placeholder task details. Replace with actual work instructions.',
        assignees: ['1'],
        precisionTime: '21:30',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Placeholder requirement A', type: 'checkbox' },
          { title: 'Placeholder requirement B', type: 'checkbox' },
          { title: 'Placeholder quality score', type: 'slider' },
        ]),
      },
      {
        id: 'w-29',
        title: 'Placeholder Work 5',
        description: 'Placeholder task details. Replace with actual work instructions.',
        assignees: ['1'],
        precisionTime: '21:40',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Placeholder requirement A', type: 'checkbox' },
          { title: 'Placeholder requirement B', type: 'checkbox' },
          { title: 'Placeholder quality score', type: 'slider' },
        ]),
      },
      {
        id: 'w-30',
        title: 'Placeholder Work 6',
        description: 'Placeholder task details. Replace with actual work instructions.',
        assignees: ['1'],
        precisionTime: '21:50',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Placeholder requirement A', type: 'checkbox' },
          { title: 'Placeholder requirement B', type: 'checkbox' },
          { title: 'Placeholder quality score', type: 'slider' },
        ]),
      },
      {
        id: 'w-31',
        title: 'Placeholder Work 7',
        description: 'Placeholder task details. Replace with actual work instructions.',
        assignees: ['1'],
        precisionTime: '21:55',
        status: 'pending',
        requirements: makeReqs([
          { title: 'Placeholder requirement A', type: 'checkbox' },
          { title: 'Placeholder requirement B', type: 'checkbox' },
          { title: 'Placeholder quality score', type: 'slider' },
        ]),
      },
    ],
  },
];

export function calculateScore(requirements: Requirement[]): number {
  if (requirements.length === 0) return 10;
  const totalWeight = requirements.reduce((s, r) => s + r.weight, 0);
  const weightedSum = requirements.reduce((s, r) => s + r.value * r.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 10;
}

export function getCompletionPercent(requirements: Requirement[]): number {
  if (requirements.length === 0) return 100;
  const done = requirements.filter(r => (r.type === 'checkbox' ? r.value === 1 : r.value > 0)).length;
  return Math.round((done / requirements.length) * 100);
}
