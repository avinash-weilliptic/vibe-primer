"use client";

import { useState, useTransition } from "react";
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
import type { Priority } from "@prisma/client";
import { useKanbanDnd } from "@/hooks/useKanbanDnd";
import { createTask, moveTask } from "@/lib/actions/tasks";
import { TaskDrawer } from "@/components/kanban/TaskDrawer";
import type {
  KanbanColumn,
  KanbanTask,
  ProjectWithBoard,
} from "@/types/kanban";

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  MEDIUM: "bg-sky-100 text-sky-700 ring-sky-200",
  HIGH: "bg-amber-100 text-amber-800 ring-amber-200",
  URGENT: "bg-red-100 text-red-700 ring-red-200",
};

function TaskCard({
  task,
  dragging = false,
}: {
  task: KanbanTask;
  dragging?: boolean;
}) {
  return (
    <article
      className={`rounded-md bg-white p-3 shadow-sm ring-1 ring-zinc-200/60 ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <h3 className="text-sm font-medium leading-snug text-zinc-900">
        {task.title}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
        {task.labels.map(({ label }) => (
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

function SortableTaskCard({
  task,
  columnId,
  onSelect,
}: {
  task: KanbanTask;
  columnId: string;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <TaskCard task={task} dragging={isDragging} />
    </div>
  );
}

function AddTaskForm({
  projectId,
  columnId,
  onAdded,
}: {
  projectId: string;
  columnId: string;
  onAdded: (task: KanbanTask) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = title.trim();
    if (!value) return;
    startTransition(async () => {
      try {
        const task = await createTask(projectId, columnId, value, "MEDIUM");
        onAdded(task);
        setTitle("");
        setOpen(false);
      } catch (err) {
        console.error("createTask failed", err);
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800"
      >
        + Add task
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mt-1 rounded-md bg-white p-2 shadow-sm ring-1 ring-zinc-200/60"
    >
      <textarea
        autoFocus
        value={title}
        disabled={pending}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        placeholder="Task title..."
        rows={2}
        className="w-full resize-none border-0 p-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
          className="text-xs text-zinc-500 hover:text-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function KanbanColumnView({
  column,
  projectId,
  onTaskAdded,
  onTaskSelected,
}: {
  column: KanbanColumn;
  projectId: string;
  onTaskAdded: (task: KanbanTask) => void;
  onTaskSelected: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  return (
    <section
      ref={setNodeRef}
      className={`flex max-h-[calc(100vh-180px)] w-[280px] shrink-0 flex-col rounded-lg transition-colors ${
        isOver ? "bg-zinc-200/80" : "bg-zinc-100/80"
      }`}
    >
      <header className="flex items-center justify-between border-b border-zinc-200/70 px-3 py-2.5">
        <h2 className="text-sm font-medium text-zinc-700">{column.name}</h2>
        <span className="rounded bg-zinc-200/70 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
          {column.tasks.length}
        </span>
      </header>

      <SortableContext
        items={column.tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
          {column.tasks.length === 0 && (
            <p className="py-4 text-center text-xs text-zinc-400">
              Drop tasks here
            </p>
          )}
          {column.tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              columnId={column.id}
              onSelect={() => onTaskSelected(task.id)}
            />
          ))}
          <AddTaskForm
            projectId={projectId}
            columnId={column.id}
            onAdded={onTaskAdded}
          />
        </div>
      </SortableContext>
    </section>
  );
}

export function KanbanBoard({ project }: { project: ProjectWithBoard }) {
  const {
    columns,
    activeTask,
    sensors,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    addTask,
    patchTask,
  } = useKanbanDnd(project.columns, { onMove: moveTask });

  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = openTaskId
    ? (columns.flatMap((c) => c.tasks).find((t) => t.id === openTaskId) ?? null)
    : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumnView
              key={column.id}
              column={column}
              projectId={project.id}
              onTaskAdded={addTask}
              onTaskSelected={setOpenTaskId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-1 opacity-90">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openTask && (
        <TaskDrawer
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onSaved={(patch) => patchTask(openTask.id, patch)}
        />
      )}
    </>
  );
}
