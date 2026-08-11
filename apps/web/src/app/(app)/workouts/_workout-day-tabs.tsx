import type { WorkoutDayDraft } from '@/application/workouts/workout-editor-model';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface WorkoutDayTabsProps {
  days: WorkoutDayDraft[];
  activeDay: number;
  disabled: boolean;
  onAddDay: () => void;
  onSelectDay: (index: number) => void;
  onRenameDay: (index: number, label: string) => void;
  onRemoveDay: (index: number) => void;
}

export function WorkoutDayTabs({
  days,
  activeDay,
  disabled,
  onAddDay,
  onSelectDay,
  onRenameDay,
  onRemoveDay,
}: WorkoutDayTabsProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);

  return (
    <div className="flex min-w-0 items-end border-b border-border bg-card px-4 pt-3 sm:px-6">
      <div
        role="tablist"
        aria-label="Dias do treino"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
      >
        {days.map((day, index) => (
          <div
            key={day.id}
            className={`group flex shrink-0 items-center border-b-2 px-1 pb-3 ${
              index === activeDay
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {editingDay === index ? (
              <Input
                value={day.label}
                aria-label={`Nome de ${day.label}`}
                className="h-8 w-32 px-2"
                autoFocus
                onChange={(event) => onRenameDay(index, event.target.value)}
                onBlur={() => setEditingDay(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    event.preventDefault();
                    setEditingDay(null);
                  }
                }}
              />
            ) : (
              <button
                type="button"
                role="tab"
                id={`workout-day-tab-${day.id}`}
                aria-controls={`workout-day-panel-${day.id}`}
                aria-selected={index === activeDay}
                aria-label={day.label}
                tabIndex={index === activeDay ? 0 : -1}
                className="px-2 py-1 font-display text-sm font-semibold"
                onClick={() => onSelectDay(index)}
              >
                {day.label}
              </button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Renomear ${day.label}`}
              disabled={disabled}
              onClick={() => {
                onSelectDay(index);
                setEditingDay(index);
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
            {days.length > 1 && (
              <ConfirmationDialog
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${day.label}`}
                    disabled={disabled}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                }
                title="Remover dia?"
                description={`O dia ${day.label} e todos os seus exercícios serão removidos.`}
                confirmLabel="Remover dia"
                pendingLabel="Removendo..."
                confirmAction={() => onRemoveDay(index)}
              />
            )}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="mb-3 ml-2 shrink-0"
        aria-label="Adicionar dia"
        disabled={disabled || days.length >= 7}
        onClick={onAddDay}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
