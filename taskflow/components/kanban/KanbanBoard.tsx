"use client";

import { useState, type FormEvent } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useKanbanDnd } from "@/hooks/useKanbanDnd";
import { createTask } from "@/lib/actions/tasks";
import { TaskDrawer } from "./TaskDrawer";

export type KanbanPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type KanbanLabel = {
  id: string;
  name: string;
  color: string;
};

export type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  priority: KanbanPriority;
  labels: KanbanLabel[];
};

export type KanbanColumn = {
  id: string;
  name: string;
  tasks: KanbanTask[];
};

interface Props {
  projectId: string;
  columns: KanbanColumn[];
}

const PRIORITY_STYLES: Record<KanbanPriority, string> = {
  LOW: "bg-gray-100 text-gray-700 ring-gray-200",
  MEDIUM: "bg-blue-50 text-blue-700 ring-blue-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  URGENT: "bg-red-50 text-red-700 ring-red-200",
};

export function KanbanBoard({ projectId, columns: initialColumns }: Props) {
  const {
    columns,
    setColumns,
    activeTask,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useKanbanDnd(initialColumns);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = selectedTaskId
    ? columns.flatMap((c) => c.tasks).find((t) => t.id === selectedTaskId) ??
      null
    : null;

  async function addTask(columnId: string, title: string) {
    const created = await createTask(projectId, columnId, title, "MEDIUM");
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, tasks: [...col.tasks, created] }
          : col,
      ),
    );
  }

  function applyTaskUpdate(
    taskId: string,
    fields: {
      title: string;
      description: string | null;
      priority: KanbanPriority;
    },
  ) {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) =>
          t.id === taskId ? { ...t, ...fields } : t,
        ),
      })),
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-[calc(100vh-180px)] gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            onAddTask={addTask}
            onSelectTask={setSelectedTaskId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCardView task={activeTask} overlay /> : null}
      </DragOverlay>
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onSaved={(fields) => applyTaskUpdate(selectedTask.id, fields)}
        />
      )}
    </DndContext>
  );
}

function ColumnView({
  column,
  onAddTask,
  onSelectTask,
}: {
  column: KanbanColumn;
  onAddTask: (columnId: string, title: string) => Promise<void>;
  onSelectTask: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[280px] flex-shrink-0 flex-col rounded-lg bg-gray-50 ring-1 transition-colors ${
        isOver ? "ring-blue-300" : "ring-gray-200"
      }`}
    >
      <header className="border-b border-gray-200 px-3 py-3">
        <h2 className="text-sm font-semibold text-gray-700">{column.name}</h2>
      </header>
      <SortableContext
        items={column.tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
          {column.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onSelect={() => onSelectTask(task.id)}
            />
          ))}
          {column.tasks.length === 0 && (
            <p className="px-1 py-2 text-xs text-gray-400">No tasks</p>
          )}
        </div>
      </SortableContext>
      <div className="border-t border-gray-200 p-2">
        <AddTaskForm onSubmit={(title) => onAddTask(column.id, title)} />
      </div>
    </div>
  );
}

function AddTaskForm({
  onSubmit,
}: {
  onSubmit: (title: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setTitle("");
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      close();
    } catch (err) {
      console.error(err);
      setError("Failed to create task");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        + Add Task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        disabled={pending}
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-60"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || title.trim().length === 0}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={close}
          disabled={pending}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SortableTaskCard({
  task,
  onSelect,
}: {
  task: KanbanTask;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task" } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
    >
      <TaskCardView task={task} />
    </div>
  );
}

function TaskCardView({
  task,
  overlay = false,
}: {
  task: KanbanTask;
  overlay?: boolean;
}) {
  return (
    <article
      className={`rounded-md bg-white p-3 ring-1 ring-gray-200/70 ${
        overlay
          ? "rotate-2 cursor-grabbing opacity-90 shadow-lg"
          : "cursor-grab shadow-sm hover:shadow-md"
      }`}
    >
      <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
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
  );
}
