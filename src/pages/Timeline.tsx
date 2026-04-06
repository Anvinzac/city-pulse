import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { timeframes as initialTimeframes, calculateScore, getCompletionPercent, Timeframe, Work } from '@/data/mockData';
import { TimeframeCard } from '@/components/TimeframeCard';
import { RequirementRow } from '@/components/RequirementRow';
import { ScoreRing } from '@/components/ScoreRing';
import { AvatarStack } from '@/components/AvatarStack';
import { ArrowLeft, Clock, Camera, MessageSquare, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Timeline() {
  const [tfs, setTfs] = useState<Timeframe[]>(initialTimeframes);
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [completedWork, setCompletedWork] = useState<{ score: number } | null>(null);

  const selectedWork = tfs.flatMap(tf => tf.works).find(w => w.id === selectedWorkId);
  const selectedTf = tfs.find(tf => tf.works.some(w => w.id === selectedWorkId));

  function updateWork(workId: string, updater: (w: Work) => Work) {
    setTfs(prev => prev.map(tf => ({
      ...tf,
      works: tf.works.map(w => w.id === workId ? updater(w) : w),
    })));
  }

  function toggleRequirement(workId: string, reqId: string) {
    updateWork(workId, w => ({
      ...w,
      status: 'in-progress' as const,
      requirements: w.requirements.map(r =>
        r.id === reqId ? { ...r, value: r.value === 1 ? 0 : 1, completedAt: new Date().toISOString(), completedBy: '1' } : r
      ),
    }));
  }

  function setSliderValue(workId: string, reqId: string, value: number) {
    updateWork(workId, w => ({
      ...w,
      status: 'in-progress' as const,
      requirements: w.requirements.map(r =>
        r.id === reqId ? { ...r, value, completedAt: new Date().toISOString(), completedBy: '1' } : r
      ),
    }));
  }

  function completeWork(workId: string) {
    const work = tfs.flatMap(tf => tf.works).find(w => w.id === workId);
    if (!work) return;
    const score = calculateScore(work.requirements);
    
    updateWork(workId, w => ({
      ...w,
      status: 'done',
      completedAt: new Date().toISOString(),
    }));

    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#FF3B5C', '#00E5FF', '#FFB000'],
      disableForReducedMotion: true,
    });

    setCompletedWork({ score });
    setTimeout(() => {
      setCompletedWork(null);
      setSelectedWorkId(null);
    }, 2500);
  }

  const allRequirementsTouched = selectedWork?.requirements.every(
    r => r.type === 'checkbox' ? r.value === 1 : r.value > 0
  ) ?? false;

  // Sort: active first
  const sortedTfs = [...tfs].sort((a, b) => {
    const order = { active: 0, overdue: 1, upcoming: 2, completed: 3 };
    return order[a.status] - order[b.status];
  });

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen pb-20">
      <AnimatePresence mode="wait">
        {/* COMPLETION OVERLAY */}
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

        {/* WORK DETAIL */}
        {selectedWork && !completedWork ? (
          <motion.div
            key="detail"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed inset-0 z-40 bg-background overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setSelectedWorkId(null)} className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-bold text-foreground truncate">{selectedWork.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-tabular">{selectedTf?.startTime}–{selectedTf?.endTime}</span>
                  </div>
                </div>
                <ScoreRing score={calculateScore(selectedWork.requirements)} size={44} strokeWidth={3} />
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-4 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedWork.description}</p>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Assigned:</span>
                <AvatarStack assigneeIds={selectedWork.assignees} size={26} />
              </div>

              <div>
                <h4 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Requirements ({selectedWork.requirements.filter(r => r.type === 'checkbox' ? r.value === 1 : r.value > 0).length}/{selectedWork.requirements.length})
                </h4>
                <div className="space-y-2">
                  {selectedWork.requirements.map(req => (
                    <RequirementRow
                      key={req.id}
                      requirement={req}
                      onToggle={(id) => toggleRequirement(selectedWork.id, id)}
                      onSliderChange={(id, val) => setSliderValue(selectedWork.id, id, val)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom sticky bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4">
              <div className="flex items-center gap-3">
                <button className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  <Camera className="w-5 h-5 text-muted-foreground" />
                </button>
                <button className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => completeWork(selectedWork.id)}
                  disabled={!allRequirementsTouched || selectedWork.status === 'done'}
                  className={`flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all ${
                    allRequirementsTouched && selectedWork.status !== 'done'
                      ? 'bg-primary text-primary-foreground glow-coral active:scale-[0.98]'
                      : selectedWork.status === 'done'
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {selectedWork.status === 'done' ? '✓ Completed' : 'Complete Work'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* TIMELINE */}
      <header className="px-4 pt-6 pb-4">
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="text-2xl font-display font-bold text-foreground">Yuki's Timeline</h1>
        <p className="text-xs text-muted-foreground text-tabular mt-1">
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      <div className="px-4 space-y-3 pb-4">
        {sortedTfs.map((tf, i) => (
          <TimeframeCard
            key={tf.id}
            timeframe={tf}
            index={i}
            onWorkClick={setSelectedWorkId}
          />
        ))}
      </div>
    </div>
  );
}
