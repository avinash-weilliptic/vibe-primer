"use client";

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

export interface KanbanLabel {
  id: string;
  name: string;
  color: string;
}

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  order: number;
  labels: KanbanLabel[];
}

export interface KanbanColumn {
  id: string;
  name: string;
  order: number;
  tasks: KanbanTask[];
}

export interface KanbanProject {
  id: string;
  name: string;
  description: string | null;
  columns: KanbanColumn[];
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700 ring-gray-200",
  MEDIUM: "bg-blue-100 text-blue-700 ring-blue-200",
  HIGH: "bg-orange-100 text-orange-800 ring-orange-200",
  URGENT: "bg-red-100 text-red-700 ring-red-200",
};

export function KanbanBoard({ project }: { project: KanbanProject }) {
  const {
    columns,
    activeTask,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useKanbanDnd(project);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <BoardColumn key={column.id} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({ column }: { column: KanbanColumn }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex h-[calc(100vh-180px)] w-[280px] shrink-0 flex-col rounded-lg bg-gray-100 transition-colors ${
        isOver ? "ring-2 ring-blue-300" : ""
      }`}
    >
      <header className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <h2 className="text-sm font-medium text-gray-800">{column.name}</h2>
        <span className="text-xs text-gray-500">{column.tasks.length}</span>
      </header>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {column.tasks.length === 0 ? (
            <p className="px-1 py-3 text-xs italic text-gray-400">No tasks</p>
          ) : (
            column.tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({ task }: { task: KanbanTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

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
      className={`cursor-grab touch-none active:cursor-grabbing ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task }: { task: KanbanTask }) {
  return (
    <article className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-medium leading-snug text-gray-900">
        {task.title}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.labels.map((label) => (
          <LabelChip key={label.id} label={label} />
        ))}
      </div>
    </article>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.MEDIUM;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {priority}
    </span>
  );
}

function LabelChip({ label }: { label: KanbanLabel }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
    </span>
  );
}
