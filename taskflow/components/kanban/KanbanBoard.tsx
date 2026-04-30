"use client";

export type KanbanPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type KanbanLabel = {
  id: string;
  name: string;
  color: string;
};

export type KanbanTask = {
  id: string;
  title: string;
  priority: KanbanPriority;
  labels: KanbanLabel[];
};

export type KanbanColumn = {
  id: string;
  name: string;
  tasks: KanbanTask[];
};

interface Props {
  columns: KanbanColumn[];
}

const PRIORITY_STYLES: Record<KanbanPriority, string> = {
  LOW: "bg-gray-100 text-gray-700 ring-gray-200",
  MEDIUM: "bg-blue-50 text-blue-700 ring-blue-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  URGENT: "bg-red-50 text-red-700 ring-red-200",
};

export function KanbanBoard({ columns }: Props) {
  return (
    <div className="flex h-[calc(100vh-180px)] gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex w-[280px] flex-shrink-0 flex-col rounded-lg bg-gray-50 ring-1 ring-gray-200"
        >
          <header className="border-b border-gray-200 px-3 py-3">
            <h2 className="text-sm font-semibold text-gray-700">
              {column.name}
            </h2>
          </header>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
            {column.tasks.map((task) => (
              <article
                key={task.id}
                className="rounded-md bg-white p-3 shadow-sm ring-1 ring-gray-200/70"
              >
                <h3 className="text-sm font-medium text-gray-900">
                  {task.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${PRIORITY_STYLES[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  {task.labels.map((label) => (
                    <span
                      key={label.id}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            {column.tasks.length === 0 && (
              <p className="px-1 py-2 text-xs text-gray-400">No tasks</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
