import { motion } from 'framer-motion';
import { ScoreRing } from '@/components/ScoreRing';
import { timeframes, calculateScore } from '@/data/mockData';
import { TrendingUp, Calendar } from 'lucide-react';

export default function Scores() {
  const worksWithScores = timeframes.flatMap(tf =>
    tf.works.filter(w => w.assignees.includes('1')).map(w => ({
      ...w,
      score: calculateScore(w.requirements),
      timeframe: tf,
    }))
  );

  const completedWorks = worksWithScores.filter(w => w.status === 'done');
  const avgScore = completedWorks.length > 0
    ? Math.round((completedWorks.reduce((s, w) => s + w.score, 0) / completedWorks.length) * 10) / 10
    : 0;

  const weekScores = [7.2, 8.5, 6.8, 9.1, 8.0, avgScore || 7.5, 0];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen pb-20 px-2 sm:px-4">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Scores</h1>
        <p className="text-sm text-muted-foreground mt-1">Your performance overview</p>
      </header>

      {/* Today's score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-xl border border-border p-6 flex flex-col items-center mb-6"
      >
        <p className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-3">Today's Average</p>
        <ScoreRing score={avgScore} size={96} strokeWidth={6} />
        <div className="flex items-center gap-1 mt-3 text-sm text-secondary">
          <TrendingUp className="w-4 h-4" />
          <span className="font-display font-semibold">+0.3 vs yesterday</span>
        </div>
      </motion.div>

      {/* Week chart */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">This Week</span>
        </div>
        <div className="flex items-end gap-2 h-24">
          {weekScores.map((score, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(score / 10) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`w-full rounded-t-md ${
                  i === 5 ? 'bg-primary' : score > 0 ? 'bg-muted-foreground/30' : 'bg-muted'
                }`}
              />
              <span className="text-[10px] text-muted-foreground text-tabular">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Work scores */}
      <h2 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Works</h2>
      <div className="space-y-2">
        {worksWithScores.map((work, i) => (
          <motion.div
            key={work.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl bg-card border border-border"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{work.title}</p>
              <p className="text-xs text-muted-foreground text-tabular">{work.timeframe.startTime}–{work.timeframe.endTime}</p>
            </div>
            <ScoreRing score={work.score} size={40} strokeWidth={3} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
