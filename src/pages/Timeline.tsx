import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  timeframes as initialTimeframes,
  calculateScore,
  employees,
  getCompletionPercent,
  Requirement,
  Timeframe,
  Work,
} from '@/data/mockData';
import { RequirementRow } from '@/components/RequirementRow';
import { ScoreRing } from '@/components/ScoreRing';
import { Check, CheckSquare2, Clock3, PencilLine, Sparkles, Square, Trash2, Undo2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getSessionIdForDate, loadTimelineState, saveTimelineState } from '@/lib/timelineState';

type EditorState = {
  key: string;
  draft: string;
};

type ClockStep = 'hour' | 'minute';
type ClockPeriod = 'AM' | 'PM';

type NewWorkDraft = {
  title: string;
  description: string;
  precisionTime: string;
};

const EMPTY_NEW_WORK: NewWorkDraft = {
  title: '',
  description: '',
  precisionTime: '',
};

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function getRuntimeStatus(timeframe: Timeframe, nowMinutes: number): Timeframe['status'] {
  const start = parseTimeToMinutes(timeframe.startTime);
  const end = parseTimeToMinutes(timeframe.endTime);
  if (nowMinutes >= start && nowMinutes < end) return 'active';
  if (nowMinutes >= end) return 'completed';
  return 'upcoming';
}

function normalizeAssignees(assigneeIds: string[]) {
  const validIds = new Set(employees.map((employee) => employee.id));
  const unique = assigneeIds.filter((id, index) => validIds.has(id) && assigneeIds.indexOf(id) === index);
  return unique.slice(0, 2);
}

function normalizeTimeframes(timeframes: Timeframe[]) {
  return timeframes.map((timeframe) => ({
    ...timeframe,
    works: timeframe.works.map((work) => ({
      ...work,
      assignees: normalizeAssignees(work.assignees),
    })),
  }));
}

function withEmptyAssignees(timeframes: Timeframe[]) {
  return timeframes.map((timeframe) => ({
    ...timeframe,
    works: timeframe.works.map((work) => ({
      ...work,
      assignees: [],
    })),
  }));
}

function makeRequirement(type: Requirement['type'] = 'checkbox'): Requirement {
  return {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New requirement',
    type,
    weight: 1,
    mandatory: true,
    value: 0,
  };
}

function parseTimeDraft(draft: string) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(draft);
  if (!match) {
    return { hour24: 9, minute: 0 };
  }

  return {
    hour24: Number(match[1]),
    minute: Number(match[2]),
  };
}

function to12Hour(hour24: number) {
  const period: ClockPeriod = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12, period };
}

function to24Hour(hour12: number, period: ClockPeriod) {
  if (hour12 === 12) return period === 'AM' ? 0 : 12;
  return period === 'AM' ? hour12 : hour12 + 12;
}

function formatTime(hour24: number, minute: number) {
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function Timeline() {
  const [tfs, setTfs] = useState<Timeframe[]>(withEmptyAssignees(initialTimeframes));
  const [expandedWorkId, setExpandedWorkId] = useState<string | null>(null);
  const [showAllTimeframes, setShowAllTimeframes] = useState(false);
  const [assigneePickerWorkId, setAssigneePickerWorkId] = useState<string | null>(null);
  const [completedWork, setCompletedWork] = useState<{ score: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isHydrated, setIsHydrated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeEditor, setActiveEditor] = useState<EditorState | null>(null);
  const [clockStep, setClockStep] = useState<ClockStep>('hour');
  const [clockPeriod, setClockPeriod] = useState<ClockPeriod>('AM');
  const [newWorkDrafts, setNewWorkDrafts] = useState<Record<string, NewWorkDraft>>({});
  const assigneeHideTimerRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>(getSessionIdForDate(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (assigneeHideTimerRef.current) {
        window.clearTimeout(assigneeHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const loaded = await loadTimelineState(new Date());
      if (cancelled) return;

      if (Array.isArray(loaded)) {
        const totalWorks = loaded.reduce((sum, tf) => sum + (Array.isArray(tf.works) ? tf.works.length : 0), 0);
        setTfs(totalWorks >= 20 ? normalizeTimeframes(loaded) : withEmptyAssignees(initialTimeframes));
      }

      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void saveTimelineState(tfs, new Date());
  }, [tfs, isHydrated]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const currentSessionId = getSessionIdForDate(now);
  const timelineByClock = useMemo(
    () => tfs.map((tf) => ({ ...tf, status: getRuntimeStatus(tf, nowMinutes) })),
    [tfs, nowMinutes]
  );

  const activeIndex = timelineByClock.findIndex((tf) => tf.status === 'active');
  const nextUpcomingIndex = timelineByClock.findIndex((tf) => tf.status === 'upcoming');
  const displayIndex = activeIndex >= 0 ? activeIndex : nextUpcomingIndex >= 0 ? nextUpcomingIndex : timelineByClock.length - 1;
  const displayedTf = timelineByClock[displayIndex];

  useEffect(() => {
    if (showAllTimeframes || !expandedWorkId || !displayedTf) return;
    if (!displayedTf.works.some((w) => w.id === expandedWorkId)) {
      setExpandedWorkId(null);
      setAssigneePickerWorkId(null);
      setActiveEditor(null);
    }
  }, [expandedWorkId, displayedTf, showAllTimeframes]);

  useEffect(() => {
    if (!isHydrated) return;
    if (currentSessionId === sessionIdRef.current) return;

    sessionIdRef.current = currentSessionId;
    setExpandedWorkId(null);
    setAssigneePickerWorkId(null);
    setActiveEditor(null);
    setNewWorkDrafts({});

    let cancelled = false;
    (async () => {
      const loaded = await loadTimelineState(now);
      if (cancelled) return;

      if (Array.isArray(loaded)) {
        const totalWorks = loaded.reduce((sum, tf) => sum + (Array.isArray(tf.works) ? tf.works.length : 0), 0);
        setTfs(totalWorks >= 20 ? normalizeTimeframes(loaded) : withEmptyAssignees(initialTimeframes));
      } else {
        setTfs(withEmptyAssignees(initialTimeframes));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentSessionId, isHydrated, now]);

  function scheduleAssigneePickerHide() {
    if (assigneeHideTimerRef.current) {
      window.clearTimeout(assigneeHideTimerRef.current);
    }
    assigneeHideTimerRef.current = window.setTimeout(() => {
      setAssigneePickerWorkId(null);
      assigneeHideTimerRef.current = null;
    }, 5000);
  }

  function updateWork(workId: string, updater: (w: Work) => Work) {
    setTfs((prev) =>
      prev.map((tf) => ({
        ...tf,
        works: tf.works.map((w) => {
          if (w.id !== workId) return w;
          const updated = updater(w);
          return { ...updated, assignees: normalizeAssignees(updated.assignees) };
        }),
      }))
    );
  }

  function updateTimeframe(timeframeId: string, updater: (tf: Timeframe) => Timeframe) {
    setTfs((prev) => prev.map((tf) => (tf.id === timeframeId ? updater(tf) : tf)));
  }

  function toggleRequirement(workId: string, reqId: string) {
    updateWork(workId, (w) => ({
      ...w,
      status: 'in-progress' as const,
      requirements: w.requirements.map((r) =>
        r.id === reqId
          ? { ...r, value: r.value === 1 ? 0 : 1, completedAt: new Date().toISOString(), completedBy: '1' }
          : r
      ),
    }));
  }

  function setSliderValue(workId: string, reqId: string, value: number) {
    updateWork(workId, (w) => ({
      ...w,
      status: 'in-progress' as const,
      requirements: w.requirements.map((r) =>
        r.id === reqId ? { ...r, value, completedAt: new Date().toISOString(), completedBy: '1' } : r
      ),
    }));
  }

  function updateRequirement(workId: string, reqId: string, updater: (req: Requirement) => Requirement) {
    updateWork(workId, (w) => ({
      ...w,
      requirements: w.requirements.map((req) => (req.id === reqId ? updater(req) : req)),
    }));
  }

  function deleteRequirement(workId: string, reqId: string) {
    updateWork(workId, (w) => ({
      ...w,
      requirements: w.requirements.filter((req) => req.id !== reqId),
    }));
  }

  function addRequirement(workId: string) {
    updateWork(workId, (w) => ({
      ...w,
      requirements: [...w.requirements, makeRequirement('checkbox')],
      status: 'in-progress' as const,
    }));
  }

  function deleteWork(workId: string) {
    const confirmed = window.confirm('Delete this work item? This cannot be undone.');
    if (!confirmed) return;

    setTfs((prev) =>
      prev.map((tf) => ({
        ...tf,
        works: tf.works.filter((w) => w.id !== workId),
      }))
    );

    if (expandedWorkId === workId) setExpandedWorkId(null);
    if (assigneePickerWorkId === workId) setAssigneePickerWorkId(null);
  }

  function completeWork(workId: string) {
    const work = tfs.flatMap((tf) => tf.works).find((w) => w.id === workId);
    if (!work) return;

    const score = calculateScore(work.requirements);

    updateWork(workId, (w) => ({
      ...w,
      status: 'done',
      completedAt: new Date().toISOString(),
    }));

    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#1570EF', '#0F9B8E', '#F97316'],
      disableForReducedMotion: true,
    });

    setCompletedWork({ score });
    setTimeout(() => {
      setCompletedWork(null);
      setExpandedWorkId(null);
      setAssigneePickerWorkId(null);
      setActiveEditor(null);
    }, 2500);
  }

  function toggleAssignee(workId: string, employeeId: string) {
    scheduleAssigneePickerHide();
    updateWork(workId, (work) => {
      const hasEmployee = work.assignees.includes(employeeId);
      if (hasEmployee) return work;
      if (work.assignees.length >= 2) return work;
      return { ...work, assignees: [...work.assignees, employeeId], status: 'in-progress' as const };
    });
  }

  function toggleAssigneePicker(workId: string) {
    setAssigneePickerWorkId((prev) => {
      if (prev === workId) return null;
      return workId;
    });

    if (assigneePickerWorkId !== workId) {
      scheduleAssigneePickerHide();
    } else if (assigneeHideTimerRef.current) {
      window.clearTimeout(assigneeHideTimerRef.current);
      assigneeHideTimerRef.current = null;
    }
  }

  function beginEditor(key: string, currentValue: string, type: 'text' | 'time' = 'text') {
    setActiveEditor({ key, draft: currentValue });
    if (type === 'time') {
      const parsed = parseTimeDraft(currentValue || '09:00');
      const time12 = to12Hour(parsed.hour24);
      setClockPeriod(time12.period);
      setClockStep('hour');
    }
  }

  function updateEditorDraft(value: string) {
    setActiveEditor((prev) => (prev ? { ...prev, draft: value } : prev));
  }

  function clearEditorDraft() {
    setActiveEditor((prev) => (prev ? { ...prev, draft: '' } : prev));
  }

  function cancelEditor() {
    setActiveEditor(null);
  }

  function commitEditor(key: string, onSave: (value: string) => void) {
    if (!activeEditor || activeEditor.key !== key) return;
    onSave(activeEditor.draft);
    setActiveEditor(null);
  }

  function setClockHour(hour12: number) {
    setActiveEditor((prev) => {
      if (!prev) return prev;
      const parsed = parseTimeDraft(prev.draft || '09:00');
      const hour24 = to24Hour(hour12, clockPeriod);
      return { ...prev, draft: formatTime(hour24, parsed.minute) };
    });
    setClockStep('minute');
  }

  function setClockMinute(minute: number) {
    setActiveEditor((prev) => {
      if (!prev) return prev;
      const parsed = parseTimeDraft(prev.draft || '09:00');
      return { ...prev, draft: formatTime(parsed.hour24, minute) };
    });
  }

  function getDraft(timeframeId: string, defaultTime = '') {
    if (newWorkDrafts[timeframeId]) return newWorkDrafts[timeframeId];
    return { ...EMPTY_NEW_WORK, precisionTime: defaultTime };
  }

  function setDraft(timeframeId: string, patch: Partial<NewWorkDraft>) {
    setNewWorkDrafts((prev) => ({
      ...prev,
      [timeframeId]: { ...(prev[timeframeId] ?? EMPTY_NEW_WORK), ...patch },
    }));
  }

  function maybeCreateWork(timeframeId: string, defaultTime = '') {
    const draft = getDraft(timeframeId, defaultTime);
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!title) return;

    updateTimeframe(timeframeId, (timeframe) => ({
      ...timeframe,
      works: [
        ...timeframe.works,
        {
          id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title,
          description,
          assignees: [],
          precisionTime: draft.precisionTime || undefined,
          requirements: [makeRequirement('checkbox')],
          status: 'pending',
        },
      ],
    }));

    setDraft(timeframeId, EMPTY_NEW_WORK);
  }

  function renderInlineEditor(params: {
    keyValue: string;
    value: string;
    placeholder: string;
    type?: 'text' | 'time';
    className?: string;
    onSave: (value: string) => void;
  }) {
    const { keyValue, value, placeholder, type = 'text', className = '', onSave } = params;
    const isActive = activeEditor?.key === keyValue;

    if (!isEditMode) {
      return <span className={className}>{value || placeholder}</span>;
    }

    if (!isActive) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            beginEditor(keyValue, value, type);
          }}
          className={`text-left ${className} ${value ? '' : 'opacity-65'}`}
          title="Tap to edit"
        >
          {value || placeholder}
        </button>
      );
    }

    if (type === 'time') {
      const parsed = parseTimeDraft(activeEditor?.draft || '09:00');
      const time12 = to12Hour(parsed.hour24);
      const selectedMinuteTick = Math.round(parsed.minute / 5) * 5;
      const hourNodes = Array.from({ length: 12 }, (_, i) => i + 1);
      const minuteNodes = Array.from({ length: 12 }, (_, i) => i * 5);
      const handValue = clockStep === 'hour' ? time12.hour12 : selectedMinuteTick / 5;
      const handAngle = (handValue / 12) * 360 - 90;

      return (
        <div className="relative z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setClockStep((prev) => (prev === 'hour' ? 'minute' : 'hour'));
            }}
            className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent"
            title="Tap to edit time"
          >
            <Clock3 className="h-3 w-3" />
            <span>{activeEditor?.draft || placeholder}</span>
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-3 shadow-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex rounded-md bg-muted p-0.5">
                <button
                  onClick={() => setClockStep('hour')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold ${clockStep === 'hour' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                >
                  Hour
                </button>
                <button
                  onClick={() => setClockStep('minute')}
                  className={`px-2 py-1 rounded text-[10px] font-semibold ${clockStep === 'minute' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                >
                  Minute
                </button>
              </div>

              <div className="inline-flex rounded-md bg-muted p-0.5">
                <button
                  onClick={() => {
                    setClockPeriod('AM');
                    const parsedTime = parseTimeDraft(activeEditor?.draft || '09:00');
                    const hour12Value = to12Hour(parsedTime.hour24).hour12;
                    updateEditorDraft(formatTime(to24Hour(hour12Value, 'AM'), parsedTime.minute));
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-semibold ${clockPeriod === 'AM' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                >
                  AM
                </button>
                <button
                  onClick={() => {
                    setClockPeriod('PM');
                    const parsedTime = parseTimeDraft(activeEditor?.draft || '09:00');
                    const hour12Value = to12Hour(parsedTime.hour24).hour12;
                    updateEditorDraft(formatTime(to24Hour(hour12Value, 'PM'), parsedTime.minute));
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-semibold ${clockPeriod === 'PM' ? 'bg-background text-foreground' : 'text-muted-foreground'}`}
                >
                  PM
                </button>
              </div>
            </div>

            <div className="relative mx-auto h-40 w-40 rounded-full border border-border bg-background">
              <div
                className="absolute left-1/2 top-1/2 h-0.5 w-[30%] bg-primary origin-left"
                style={{ transform: `translate(0, -50%) rotate(${handAngle}deg)` }}
              />
              <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />

              {(clockStep === 'hour' ? hourNodes : minuteNodes).map((valueAtPos, idx) => {
                const angle = (idx / 12) * Math.PI * 2 - Math.PI / 2;
                const radius = 60;
                const x = 80 + Math.cos(angle) * radius;
                const y = 80 + Math.sin(angle) * radius;
                const isSelected = clockStep === 'hour' ? time12.hour12 === valueAtPos : selectedMinuteTick === valueAtPos;

                return (
                  <button
                    key={`${clockStep}-${valueAtPos}`}
                    onClick={() => {
                      if (clockStep === 'hour') {
                        setClockHour(valueAtPos);
                      } else {
                        setClockMinute(valueAtPos);
                      }
                    }}
                    className={`absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full text-[10px] font-semibold ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-muted'
                    }`}
                    style={{ left: `${x}px`, top: `${y}px` }}
                  >
                    {clockStep === 'hour' ? valueAtPos : String(valueAtPos).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-tabular text-muted-foreground">{activeEditor?.draft || '--:--'}</span>
              <div className="flex items-center gap-1">
                <button onClick={clearEditorDraft} className="p-1 rounded-md bg-muted text-muted-foreground" title="Clear">
                  <X className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => commitEditor(keyValue, onSave)} className="p-1 rounded-md bg-primary text-primary-foreground" title="Done">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={cancelEditor} className="p-1 rounded-md bg-muted text-muted-foreground" title="Cancel">
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type={type}
          value={activeEditor?.draft ?? ''}
          onChange={(e) => updateEditorDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitEditor(keyValue, onSave);
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelEditor();
            }
          }}
          className="w-full rounded-md border border-primary/30 bg-card px-2 py-1 text-sm text-foreground outline-none ring-2 ring-primary/20"
        />
        <button onClick={(e) => { e.stopPropagation(); clearEditorDraft(); }} className="p-1 rounded-md bg-muted text-muted-foreground" title="Clear">
          <X className="h-3.5 w-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); commitEditor(keyValue, onSave); }} className="p-1 rounded-md bg-primary text-primary-foreground" title="Done">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); cancelEditor(); }} className="p-1 rounded-md bg-muted text-muted-foreground" title="Cancel">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  function renderRequirements(work: Work) {
    if (!isEditMode) {
      return (
        <div className="grid grid-cols-2 max-[760px]:grid-cols-1 2xl:grid-cols-3 gap-3">
          {work.requirements.map((req) => (
            <RequirementRow
              key={req.id}
              requirement={req}
              onToggle={(id) => toggleRequirement(work.id, id)}
              onSliderChange={(id, value) => setSliderValue(work.id, id, value)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {work.requirements.map((req) => {
          const keyBase = `req-${work.id}-${req.id}`;
          const reqTitle = req.title || 'Untitled requirement';
          return (
            <div key={req.id} className="rounded-lg border border-border bg-card p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  {renderInlineEditor({
                    keyValue: `${keyBase}-title`,
                    value: req.title,
                    placeholder: 'Requirement title',
                    className: 'text-sm font-medium text-foreground truncate',
                    onSave: (nextValue) => {
                      updateRequirement(work.id, req.id, (prev) => ({ ...prev, title: nextValue.trim() || reqTitle }));
                    },
                  })}
                </div>
                <select
                  value={req.type}
                  onChange={(e) => {
                    const nextType = e.target.value as Requirement['type'];
                    updateRequirement(work.id, req.id, (prev) => ({ ...prev, type: nextType, value: 0 }));
                  }}
                  className="rounded-md border border-border bg-background px-1.5 py-1 text-xs"
                >
                  <option value="checkbox">Checkbox</option>
                  <option value="slider">Slider</option>
                </select>
                <button
                  onClick={() => deleteRequirement(work.id, req.id)}
                  className="p-1 rounded-md bg-destructive/10 text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {req.type === 'checkbox' ? (
                <button
                  onClick={() => toggleRequirement(work.id, req.id)}
                  className={`mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                    req.value === 1 ? 'bg-secondary/20 text-secondary' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Check className="h-3 w-3" />
                  {req.value === 1 ? 'Checked' : 'Unchecked'}
                </button>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(req.value * 100)}
                    onChange={(e) => setSliderValue(work.id, req.id, Number(e.target.value) / 100)}
                    className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-secondary"
                  />
                  <span className="text-xs text-tabular text-muted-foreground w-9 text-right">{Math.round(req.value * 100)}%</span>
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => addRequirement(work.id)}
          className="w-full rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground hover:border-primary/40"
        >
          Tap to add requirement
        </button>
      </div>
    );
  }

  function renderNewWorkCell(timeframe: Timeframe) {
    const draft = getDraft(timeframe.id, timeframe.startTime);

    return (
      <article className="rounded-xl border border-dashed border-primary/30 bg-card/60 p-3">
        <input
          value={draft.title}
          onChange={(e) => setDraft(timeframe.id, { title: e.target.value })}
          onBlur={() => maybeCreateWork(timeframe.id, timeframe.startTime)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              maybeCreateWork(timeframe.id, timeframe.startTime);
            }
          }}
          placeholder="Work title"
          className="w-full bg-transparent border-0 border-b border-border/70 px-1 py-1 text-base font-semibold text-foreground outline-none focus:border-primary"
        />

        <textarea
          value={draft.description}
          onChange={(e) => setDraft(timeframe.id, { description: e.target.value })}
          onBlur={() => maybeCreateWork(timeframe.id, timeframe.startTime)}
          placeholder="Description (optional)"
          className="mt-2 w-full min-h-14 rounded-md border border-border bg-background/70 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
        />

        <div className="mt-2 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <input
            type="time"
            value={draft.precisionTime}
            onChange={(e) => setDraft(timeframe.id, { precisionTime: e.target.value })}
            onBlur={() => maybeCreateWork(timeframe.id, timeframe.startTime)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
          <span className="text-xs text-muted-foreground">Leave empty if not needed</span>
        </div>
      </article>
    );
  }

  function renderTimeframeSection(timeframe: Timeframe, keyPrefix: string, transitionDelay = 0) {
    return (
      <motion.section
        key={`${keyPrefix}-${timeframe.id}`}
        initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -18, filter: 'blur(4px)' }}
        transition={{ duration: 0.45, delay: transitionDelay, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-display font-semibold text-tabular text-muted-foreground uppercase tracking-wider">
              {timeframe.startTime}-{timeframe.endTime}
            </p>
            <div className="mt-1">
              {isEditMode ? (
                renderInlineEditor({
                  keyValue: `timeframe-title-${timeframe.id}`,
                  value: timeframe.label,
                  placeholder: 'Timeframe title',
                  className: 'text-xl font-display font-bold text-foreground',
                  onSave: (nextValue) =>
                    updateTimeframe(timeframe.id, (prev) => ({
                      ...prev,
                      label: nextValue.trim() || prev.label,
                    })),
                })
              ) : (
                <h2 className="text-xl font-display font-bold text-foreground">{timeframe.label}</h2>
              )}
            </div>
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
              timeframe.status === 'active'
                ? 'bg-primary/15 text-primary'
                : timeframe.status === 'upcoming'
                ? 'bg-accent/15 text-accent'
                : 'bg-secondary/15 text-secondary'
            }`}
          >
            {timeframe.status === 'active' ? 'LIVE NOW' : timeframe.status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-2">
          {timeframe.works.map((work, index) => {
            const isExpanded = expandedWorkId === work.id;
            const isPickerOpen = assigneePickerWorkId === work.id;
            const wCompletion = getCompletionPercent(work.requirements);
            const allRequirementsTouched = work.requirements.every((r) => (r.type === 'checkbox' ? r.value === 1 : r.value > 0));

            return (
              <motion.article
                key={work.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className="rounded-xl border border-border bg-muted/50"
              >
                <button
                  onClick={() => setExpandedWorkId((prev) => (prev === work.id ? null : work.id))}
                  className="w-full flex items-center gap-3 p-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isEditMode ? (
                        renderInlineEditor({
                          keyValue: `work-title-${work.id}`,
                          value: work.title,
                          placeholder: 'Untitled work',
                          className: 'text-base font-semibold text-foreground truncate',
                          onSave: (nextValue) => updateWork(work.id, (prev) => ({ ...prev, title: nextValue.trim() || 'Untitled work' })),
                        })
                      ) : (
                        <p className="text-base font-semibold text-foreground truncate">{work.title}</p>
                      )}
                    </div>

                    <div className="mt-1">
                      {isEditMode ? (
                        renderInlineEditor({
                          keyValue: `work-desc-${work.id}`,
                          value: work.description,
                          placeholder: 'Tap to add description',
                          className: 'text-sm text-muted-foreground line-clamp-2',
                          onSave: (nextValue) => updateWork(work.id, (prev) => ({ ...prev, description: nextValue })),
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground line-clamp-2">{work.description}</p>
                      )}
                    </div>

                    <div className="mt-1.5 w-full max-w-[180px] h-1.5 rounded-full bg-background/80 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${wCompletion}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </div>

                  <div className="self-stretch w-24 flex flex-col items-end justify-between">
                    <div className="h-7">
                      {isEditMode ? (
                        renderInlineEditor({
                          keyValue: `work-time-${work.id}`,
                          value: work.precisionTime ?? '',
                          placeholder: 'Set time',
                          type: 'time',
                          className: 'inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent',
                          onSave: (nextValue) => updateWork(work.id, (prev) => ({ ...prev, precisionTime: nextValue || undefined })),
                        })
                      ) : work.precisionTime ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                          <Clock3 className="h-3 w-3" />
                          <span>{work.precisionTime}</span>
                        </div>
                      ) : null}
                    </div>

                    {isEditMode ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWork(work.id);
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        title="Delete work"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAssigneePicker(work.id);
                        }}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition-colors ${
                          isPickerOpen ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                        }`}
                        title="Quick assign"
                      >
                        {isPickerOpen ? <CheckSquare2 className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                      </button>
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isPickerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden border-t border-border/70"
                      onMouseMove={scheduleAssigneePickerHide}
                      onClick={scheduleAssigneePickerHide}
                      onTouchStart={scheduleAssigneePickerHide}
                    >
                      <div className="px-3 py-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Assign people (up to 2)</p>
                        <div className="grid grid-cols-2 gap-2">
                          {employees.map((employee) => {
                            const isSelected = work.assignees.includes(employee.id);
                            const reachedLimit = !isSelected && work.assignees.length >= 2;
                            return (
                              <button
                                key={employee.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAssignee(work.id, employee.id);
                                }}
                                disabled={reachedLimit}
                                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                                  isSelected
                                    ? 'border-primary/60 bg-primary/10 text-primary'
                                    : reachedLimit
                                    ? 'border-border bg-muted/40 text-muted-foreground opacity-55'
                                    : 'border-border bg-card hover:border-primary/40'
                                }`}
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-graphite-light text-[9px] font-display text-foreground">
                                  {employee.avatar}
                                </span>
                                <span className="min-w-0 text-[11px] font-medium truncate">{employee.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-3 border-t border-border/70">
                        <div className="pt-3">
                          <h4 className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Requirements ({work.requirements.filter((r) => (r.type === 'checkbox' ? r.value === 1 : r.value > 0)).length}/
                            {work.requirements.length})
                          </h4>
                          {renderRequirements(work)}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] text-muted-foreground">
                            {isEditMode ? 'Edit mode on: tap fields to edit with clear, done, or cancel.' : 'Open edit mode to modify all fields.'}
                          </p>
                          <button
                            onClick={() => completeWork(work.id)}
                            disabled={!allRequirementsTouched || work.status === 'done'}
                            className={`px-3 py-2 rounded-lg font-display font-bold text-xs transition-all ${
                              allRequirementsTouched && work.status !== 'done'
                                ? 'bg-primary text-primary-foreground glow-coral active:scale-[0.98]'
                                : work.status === 'done'
                                ? 'bg-secondary/20 text-secondary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {work.status === 'done' ? 'Completed' : 'Complete'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}

          {isEditMode ? renderNewWorkCell(timeframe) : null}
        </div>
      </motion.section>
    );
  }

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const displayLabel = showAllTimeframes
    ? 'All timeframes'
    : displayedTf?.status === 'active'
    ? 'Current timeframe'
    : displayedTf?.status === 'upcoming'
    ? 'Next timeframe'
    : 'Latest timeframe';

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {completedWork && (
          <motion.div
            key="completion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mb-6"
            >
              <Check className="w-10 h-10 text-secondary" />
            </motion.div>
            <p className="text-lg font-display font-bold text-foreground mb-4">Work Complete!</p>
            <ScoreRing score={completedWork.score} size={100} strokeWidth={6} />
            <p className="text-sm text-muted-foreground mt-3">Final Score</p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-2 sm:px-4 pt-6 pb-4 space-y-3">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <div className="rounded-2xl border border-primary/20 gradient-neon animate-gradient p-4 text-primary-foreground shadow-[0_12px_32px_rgba(21,112,239,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-85">Live local time</p>
              <p className="text-4xl font-display font-bold text-tabular mt-1">
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <button
              onClick={() => {
                setIsEditMode((prev) => !prev);
                setActiveEditor(null);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                isEditMode ? 'bg-white text-primary' : 'bg-white/20 text-primary-foreground'
              }`}
            >
              {isEditMode ? <Check className="h-4 w-4" /> : <PencilLine className="h-4 w-4" />}
              <span>{isEditMode ? 'Edit mode ON' : 'Edit mode'}</span>
            </button>
          </div>

          <p className="text-[12px] mt-3 opacity-90 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="px-2 sm:px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-display font-semibold uppercase tracking-widest text-muted-foreground">{displayLabel}</p>
          <button
            onClick={() => setShowAllTimeframes((prev) => !prev)}
            className={`text-xs font-semibold rounded-full px-3 py-1 transition-colors ${
              showAllTimeframes ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            All
          </button>
        </div>

        {showAllTimeframes ? (
          <div className="overflow-x-hidden">
            <div className="flex gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-2 no-scrollbar scroll-px-1 touch-pan-x">
              {timelineByClock.map((timeframe, index) => (
                <div key={`page-${timeframe.id}`} className="w-full shrink-0 snap-start snap-always">
                  {renderTimeframeSection(timeframe, 'all', index * 0.04)}
                </div>
              ))}
            </div>
          </div>
        ) : displayedTf ? (
          <AnimatePresence mode="wait">{renderTimeframeSection(displayedTf, 'single')}</AnimatePresence>
        ) : null}
      </div>
    </div>
  );
}
