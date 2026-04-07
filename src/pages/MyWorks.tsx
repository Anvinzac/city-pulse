import { motion } from 'framer-motion';
import { timeframes, getCompletionPercent } from '@/data/mockData';
import { AvatarStack } from '@/components/AvatarStack';
import { useNavigate } from 'react-router-dom';

export default function MyWorks() {
  const navigate = useNavigate();
  const allWorks = timeframes.flatMap(tf =>
    tf.works.filter(w => w.assignees.includes('1')).map(w => ({ ...w, timeframe: tf }))
  );
  const inProgress = allWorks.filter(w => w.status !== 'done');
  const done = allWorks.filter(w => w.status === 'done');

  return (
    <div className="min-h-screen pb-20 px-2 sm:px-4">
      <header className="pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold text-foreground">My Works</h1>
        <p className="text-sm text-muted-foreground mt-1">{allWorks.length} assigned today</p>
      </header>

      {inProgress.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">In Progress</h2>
          <div className="space-y-2">
            {inProgress.map((work, i) => (
              <motion.button
                key={work.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate('/')}
                className="w-full text-left p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">{work.title}</span>
                  <span className="text-xs text-tabular text-muted-foreground">{work.timeframe.startTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {work.requirements.map((r, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${(r.type === 'checkbox' ? r.value === 1 : r.value > 0) ? 'bg-secondary' : 'bg-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <AvatarStack assigneeIds={work.assignees} size={20} />
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completed</h2>
          <div className="space-y-2">
            {done.map((work, i) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl bg-card/50 border border-secondary/20"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center">
                    <span className="text-xs text-secondary">✓</span>
                  </span>
                  <span className="text-sm font-medium text-muted-foreground line-through">{work.title}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
