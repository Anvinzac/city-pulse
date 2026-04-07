import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  timeframes as initialTimeframes,
  calculateScore,
  employees,
  getCompletionPercent,
  Timeframe,
  Work,
} from '@/data/mockData';
import { RequirementRow } from '@/components/RequirementRow';
import { ScoreRing } from '@/components/ScoreRing';
import { AvatarStack } from '@/components/AvatarStack';
import { Check, CheckSquare2, Clock3, Sparkles, Square } from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'city-pulse-timeframes-v1';

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

function formatCountdown(totalSeconds: number) {
  const clamped = Math.max(totalSeconds, 0);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

function loadTimeframes(): Timeframe[] {
  if (typeof window === 'undefined') return initialTimeframes;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return withEmptyAssignees(initialTimeframes);

  try {
    const parsed = JSON.parse(stored) as Timeframe[];
    if (!Array.isArray(parsed)) return withEmptyAssignees(initialTimeframes);
    const totalWorks = parsed.reduce((sum, tf) => sum + (Array.isArray(tf.works) ? tf.works.length : 0), 0);
    return totalWorks >= 20 ? normalizeTimeframes(parsed) : withEmptyAssignees(initialTimeframes);
  } catch {
    return withEmptyAssignees(initialTimeframes);
  }
}

export default function Timeline() {
  const [tfs, setTfs] = useState<Timeframe[]>(loadTimeframes);
  const [expandedWorkId, setExpandedWorkId] = useState<string | null>(null);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [assigneePickerWorkId, setAssigneePickerWorkId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [completedWork, setCompletedWork] = useState<{ score: number } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const assigneeHideTimerRef = useRef<number | null>(null);

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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tfs));
  }, [tfs]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const timelineByClock = useMemo(
    () => tfs.map((tf) => ({ ...tf, status: getRuntimeStatus(tf, nowMinutes) })),
    [tfs, nowMinutes]
  );

  const activeIndex = timelineByClock.findIndex((tf) => tf.status === 'active');
  const nextUpcomingIndex = timelineByClock.findIndex((tf) => tf.status === 'upcoming');
  const displayIndex = activeIndex >= 0 ? activeIndex : nextUpcomingIndex >= 0 ? nextUpcomingIndex : timelineByClock.length - 1;
  const displayedTf = timelineByClock[displayIndex];

  useEffect(() => {
    if (!expandedWorkId || !displayedTf) return;
    if (!displayedTf.works.some((w) => w.id === expandedWorkId)) {
      setExpandedWorkId(null);
      setEditingWorkId(null);
      setDraftTitle('');
      setAssigneePickerWorkId(null);
    }
  }, [expandedWorkId, displayedTf]);

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
      setEditingWorkId(null);
      setDraftTitle('');
      setAssigneePickerWorkId(null);
    }, 2500);
  }

  function startTitleEdit(work: Work) {
    setEditingWorkId(work.id);
    setDraftTitle(work.title);
  }

  function saveTitle(workId: string) {
    const title = draftTitle.trim();
    if (!title) {
      setEditingWorkId(null);
      setDraftTitle('');
      return;
    }

    updateWork(workId, (w) => ({ ...w, title }));
    setEditingWorkId(null);
    setDraftTitle('');
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

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const displayLabel = displayedTf?.status === 'active' ? 'Current timeframe' : displayedTf?.status === 'upcoming' ? 'Next timeframe' : 'Latest timeframe';
  const boundaryMinutes = displayedTf
    ? displayedTf.status === 'active'
      ? parseTimeToMinutes(displayedTf.endTime)
      : parseTimeToMinutes(displayedTf.startTime)
    : 0;
  const totalSecondsToBoundary = Math.max(Math.round((boundaryMinutes - nowMinutes) * 60), 0);
  const countdownText = displayedTf
    ? displayedTf.status === 'active'
      ? `Switches in ${formatCountdown(totalSecondsToBoundary)}`
      : displayedTf.status === 'upcoming'
      ? `Starts in ${formatCountdown(totalSecondsToBoundary)}`
      : 'All frames completed for today'
    : '';

  return (
    <div className="min-h-screen pb-20">
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

      <header className="px-4 pt-6 pb-4 space-y-3">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <div className="rounded-2xl border border-primary/20 gradient-neon animate-gradient p-4 text-primary-foreground shadow-[0_12px_32px_rgba(21,112,239,0.24)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] font-semibold opacity-85">Live local time</p>
              <p className="text-4xl font-display font-bold text-tabular mt-1">
                {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="relative">
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-white/30"
                animate={{ scale: [1, 1.7, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
          </div>
          <p className="text-[12px] mt-3 opacity-90">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-display font-semibold uppercase tracking-widest text-muted-foreground">{displayLabel}</p>
          <p className="text-xs text-tabular text-muted-foreground">{countdownText}</p>
        </div>

        {displayedTf && (
          <AnimatePresence mode="wait">
            <motion.section
              key={displayedTf.id}
              initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, filter: 'blur(4px)' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-display font-semibold text-tabular text-muted-foreground uppercase tracking-wider">
                    {displayedTf.startTime}-{displayedTf.endTime}
                  </p>
                  <h2 className="text-xl font-display font-bold text-foreground mt-1">{displayedTf.label}</h2>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                    displayedTf.status === 'active'
                      ? 'bg-primary/15 text-primary'
                      : displayedTf.status === 'upcoming'
                      ? 'bg-accent/15 text-accent'
                      : 'bg-secondary/15 text-secondary'
                  }`}
                >
                  {displayedTf.status === 'active' ? 'LIVE NOW' : displayedTf.status.toUpperCase()}
                </span>
              </div>

              {displayedTf.works.length > 0 ? (
                <div className="space-y-2">
                  {displayedTf.works.map((work, index) => {
                    const isExpanded = expandedWorkId === work.id;
                    const isEditing = editingWorkId === work.id;
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
                              {isEditing ? (
                                <input
                                  autoFocus
                                  value={draftTitle}
                                  onChange={(e) => setDraftTitle(e.target.value)}
                                  onBlur={() => saveTitle(work.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      saveTitle(work.id);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingWorkId(null);
                                      setDraftTitle('');
                                    }
                                  }}
                                  className="w-full rounded-md border border-primary/30 bg-card px-2 py-1 text-sm font-semibold text-foreground outline-none ring-2 ring-primary/20"
                                />
                              ) : (
                                <p
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startTitleEdit(work);
                                  }}
                                  className="text-sm font-semibold text-foreground truncate cursor-text"
                                  title="Tap to edit title"
                                >
                                  {work.title}
                                </p>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{work.description}</p>
                            {work.precisionTime && (
                              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                                <Clock3 className="h-3 w-3" />
                                <span>{work.precisionTime}</span>
                              </div>
                            )}
                            <div className="mt-1.5 w-full max-w-[180px] h-1.5 rounded-full bg-background/80 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${wCompletion}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className="h-full rounded-full bg-primary"
                              />
                            </div>
                          </div>
                          <div className="self-stretch flex flex-col items-end justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAssigneePicker(work.id);
                              }}
                              className={`inline-flex h-[60%] min-h-10 aspect-square items-center justify-center rounded-lg border transition-colors ${
                                isPickerOpen ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                              }`}
                              title="Quick assign"
                            >
                              {isPickerOpen ? <CheckSquare2 className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                            </button>
                            <span className="text-xs font-display text-tabular text-muted-foreground">{wCompletion}%</span>
                            <AvatarStack assigneeIds={work.assignees} size={22} />
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
                                  <div className="space-y-2">
                                    {work.requirements.map((req) => (
                                      <RequirementRow
                                        key={req.id}
                                        requirement={req}
                                        onToggle={(id) => toggleRequirement(work.id, id)}
                                        onSliderChange={(id, value) => setSliderValue(work.id, id, value)}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] text-muted-foreground">Inline edit enabled: tap title to rename and auto-save.</p>
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
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No works assigned in this timeframe.</p>
                </div>
              )}
            </motion.section>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
