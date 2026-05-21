"use client";

import type { Priority } from "@prisma/client";

export type LabelChip = {
  id: string;
  name: string;
  color: string;
};

export type TaskCardData = {
  id: string;
  title: string;
  priority: Priority;
  labels: LabelChip[];
};

export type ColumnData = {
  id: string;
  name: string;
  tasks: TaskCardData[];
};

const PRIORITY_STYLES: Record<Priority, { label: string; className: string }> =
  {
    LOW: {
      label: "Low",
      className:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
    MEDIUM: {
      label: "Medium",
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    },
    HIGH: {
      label: "High",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },
    URGENT: {
      label: "Urgent",
      className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    },
  };

function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, className } = PRIORITY_STYLES[priority];
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function LabelChips({ labels }: { labels: LabelChip[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-black/70 dark:text-white/70"
          style={{ backgroundColor: `${label.color}20` }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: label.color }}
          />
          {label.name}
        </span>
      ))}
    </div>
  );
}

function TaskCard({ task }: { task: TaskCardData }) {
  return (
    <div className="space-y-2 rounded-lg border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        <LabelChips labels={task.labels} />
      </div>
    </div>
  );
}

export function KanbanBoard({ columns }: { columns: ColumnData[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <section
          key={column.id}
          className="flex w-[280px] shrink-0 flex-col rounded-xl bg-black/[0.03] dark:bg-white/5"
        >
          <header className="flex items-center justify-between px-3 py-2.5">
            <h2 className="text-sm font-semibold">{column.name}</h2>
            <span className="text-xs text-black/50 dark:text-white/50">
              {column.tasks.length}
            </span>
          </header>
          <div className="flex max-h-[calc(100vh-260px)] flex-col gap-2 overflow-y-auto px-3 pb-3">
            {column.tasks.length === 0 ? (
              <p className="px-1 py-4 text-xs text-black/40 dark:text-white/40">
                No tasks
              </p>
            ) : (
              column.tasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
