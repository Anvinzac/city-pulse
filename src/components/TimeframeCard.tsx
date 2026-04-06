import { motion } from 'framer-motion';
import { Timeframe, getCompletionPercent, calculateScore } from '@/data/mockData';
import { AvatarStack } from './AvatarStack';
import { ChevronRight } from 'lucide-react';

interface TimeframeCardProps {
  timeframe: Timeframe;
  index: number;
  onWorkClick: (workId: string) => void;
}

export function TimeframeCard({ timeframe, index, onWorkClick }: TimeframeCardProps) {
  const isActive = timeframe.status === 'active';
  const isCompleted = timeframe.status === 'completed';
  const allAssignees = [...new Set(timeframe.works.flatMap(w => w.assignees))];
  const allReqs = timeframe.works.flatMap(w => w.requirements);
  const completion = getCompletionPercent(allReqs);

  const statusColors = {
    active: 'border-primary/60 glow-coral',
    completed: 'border-secondary/30',
    upcoming: 'border-border',
    overdue: 'border-accent/60',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`rounded-xl border-2 bg-card p-4 transition-all ${statusColors[timeframe.status]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="w-2 h-2 rounded-full bg-primary animate-live-pulse" />
          )}
          <span className="text-xs font-display font-semibold text-tabular text-muted-foreground uppercase tracking-wider">
            {timeframe.startTime}–{timeframe.endTime}
          </span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          isActive ? 'bg-primary/20 text-primary' :
          isCompleted ? 'bg-secondary/20 text-secondary' :
          'bg-muted text-muted-foreground'
        }`}>
          {timeframe.status === 'active' ? 'NOW' : timeframe.status.toUpperCase()}
        </span>
      </div>

      <h3 className="text-lg font-display font-bold text-foreground mb-3">{timeframe.label}</h3>

      {/* Works */}
      {timeframe.works.length > 0 ? (
        <div className="space-y-2">
          {timeframe.works.map((work) => {
            const wCompletion = getCompletionPercent(work.requirements);
            const reqDots = work.requirements.map(r => r.type === 'checkbox' ? r.value === 1 : r.value > 0);
            return (
              <button
                key={work.id}
                onClick={() => onWorkClick(work.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{work.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1">
                      {reqDots.map((done, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-secondary' : 'bg-muted-foreground/30'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground text-tabular">{wCompletion}%</span>
                  </div>
                </div>
                <AvatarStack assigneeIds={work.assignees} size={24} />
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No works assigned</p>
      )}

      {/* Footer */}
      {timeframe.works.length > 0 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <AvatarStack assigneeIds={allAssignees} size={22} max={4} />
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${completion === 100 ? 'bg-secondary' : isActive ? 'bg-primary' : 'bg-muted-foreground/50'}`}
                initial={{ width: 0 }}
                animate={{ width: `${completion}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-display text-tabular text-muted-foreground">{completion}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
