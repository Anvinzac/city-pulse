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
        status: 'done',
        completedAt: new Date().toISOString(),
        requirements: makeReqs([
          { title: 'Check fire exits clear', type: 'checkbox', done: 1 },
          { title: 'Verify equipment status', type: 'checkbox', done: 1 },
          { title: 'Sign attendance log', type: 'checkbox', done: 1 },
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
        id: 'w-2',
        title: 'Inventory Audit — Zone A',
        description: 'Count and verify all items in Zone A against the master inventory sheet. Report discrepancies.',
        assignees: ['1', '3'],
        status: 'in-progress',
        requirements: makeReqs([
          { title: 'Scan all shelf barcodes', type: 'checkbox' },
          { title: 'Count accuracy', type: 'slider' },
          { title: 'Photo evidence of discrepancies', type: 'checkbox' },
        ]),
      },
      {
        id: 'w-3',
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
        id: 'w-4',
        title: 'Process Optimization Review',
        description: 'Analyze bottlenecks in the packaging line and propose 3 improvements.',
        assignees: ['1', '2', '5'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Identify top 3 bottlenecks', type: 'checkbox' },
          { title: 'Draft improvement proposals', type: 'checkbox' },
          { title: 'Implementation feasibility', type: 'slider' },
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
        id: 'w-5',
        title: 'Team Training Session',
        description: 'Lead the new equipment training module for junior team members.',
        assignees: ['1', '2', '3', '5'],
        status: 'pending',
        requirements: makeReqs([
          { title: 'Presentation prepared', type: 'checkbox' },
          { title: 'Hands-on demo completed', type: 'checkbox' },
          { title: 'Quiz score threshold', type: 'slider' },
          { title: 'Attendance confirmed', type: 'checkbox' },
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
    works: [],
  },
  {
    id: 'tf-6',
    label: 'Wrap & Handover',
    startTime: '17:00',
    endTime: '18:00',
    status: 'upcoming',
    works: [],
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
