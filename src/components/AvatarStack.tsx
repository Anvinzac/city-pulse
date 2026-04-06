import { employees } from '@/data/mockData';

interface AvatarStackProps {
  assigneeIds: string[];
  max?: number;
  size?: number;
}

export function AvatarStack({ assigneeIds, max = 3, size = 28 }: AvatarStackProps) {
  const shown = assigneeIds.slice(0, max);
  const overflow = assigneeIds.length - max;

  return (
    <div className="flex -space-x-2">
      {shown.map((id) => {
        const emp = employees.find(e => e.id === id);
        return (
          <div
            key={id}
            className="rounded-full bg-graphite-light border-2 border-card flex items-center justify-center font-display text-foreground"
            style={{ width: size, height: size, fontSize: size * 0.35 }}
            title={emp?.name}
          >
            {emp?.avatar?.slice(0, 2) ?? '??'}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="rounded-full bg-muted border-2 border-card flex items-center justify-center font-body text-muted-foreground"
          style={{ width: size, height: size, fontSize: size * 0.35 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
