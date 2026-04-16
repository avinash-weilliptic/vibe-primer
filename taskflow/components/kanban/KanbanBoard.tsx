"use client";

type Label = {
  id: string;
  name: string;
  color: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  order: number;
  labels: Label[];
};

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
};

const PRIORITY_CONFIG: Record<
  Task["priority"],
  { label: string; className: string }
> = {
  LOW: { label: "Low", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  MEDIUM: { label: "Med", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  HIGH: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  URGENT: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

function TaskCard({ task }: { task: Task }) {
  const priority = PRIORITY_CONFIG[task.priority];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium">{task.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${priority.className}`}
        >
          {priority.label}
        </span>

        {task.labels.map((label) => (
          <span
            key={label.id}
            className="inline-block rounded px-1.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ columns }: { columns: Column[] }) {
  return (
    <div className="flex gap-4">
      {columns.map((column) => (
        <div key={column.id} className="w-[280px] flex-shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {column.name}
            </h3>
            <span className="text-xs text-gray-400">{column.tasks.length}</span>
          </div>

          <div className="flex max-h-[calc(100vh-180px)] flex-col gap-2 overflow-y-auto rounded-lg bg-gray-100 p-2 dark:bg-gray-900">
            {column.tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                No tasks
              </p>
            ) : (
              column.tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
