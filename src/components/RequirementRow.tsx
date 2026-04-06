import { motion } from 'framer-motion';
import { Requirement } from '@/data/mockData';
import { Check } from 'lucide-react';

interface RequirementRowProps {
  requirement: Requirement;
  onToggle: (id: string) => void;
  onSliderChange: (id: string, value: number) => void;
}

export function RequirementRow({ requirement, onToggle, onSliderChange }: RequirementRowProps) {
  const isDone = requirement.type === 'checkbox' ? requirement.value === 1 : requirement.value > 0;

  return (
    <motion.div
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 min-h-[52px]"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {requirement.type === 'checkbox' ? (
        <button
          onClick={() => onToggle(requirement.id)}
          className={`flex-shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
            isDone
              ? 'bg-secondary border-secondary'
              : 'border-muted-foreground/40 hover:border-primary'
          }`}
        >
          {isDone && <Check className="w-4 h-4 text-secondary-foreground" />}
        </button>
      ) : (
        <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted flex items-center justify-center">
          <span className="text-xs font-display text-tabular text-muted-foreground">
            {Math.round(requirement.value * 100)}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
          {requirement.title}
        </p>
        {requirement.type === 'slider' && (
          <input
            type="range"
            min={0}
            max={100}
            value={requirement.value * 100}
            onChange={(e) => onSliderChange(requirement.id, Number(e.target.value) / 100)}
            className="w-full h-1.5 mt-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-secondary"
          />
        )}
      </div>

      {requirement.mandatory && !isDone && (
        <span className="flex-shrink-0 text-[10px] font-medium text-accent uppercase tracking-wider">REQ</span>
      )}
    </motion.div>
  );
}
