import { useMemo, useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { KanbanColumn, KanbanProject, KanbanTask } from "@/components/kanban/KanbanBoard";

export function useKanbanDnd(initialProject: KanbanProject) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialProject.columns);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const columnIds = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  function findColumnId(id: UniqueIdentifier): string | null {
    const sid = String(id);
    if (columnIds.has(sid)) return sid;
    return columns.find((c) => c.tasks.some((t) => t.id === sid))?.id ?? null;
  }

  function findTask(id: UniqueIdentifier): KanbanTask | null {
    const sid = String(id);
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === sid);
      if (task) return task;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(findTask(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const fromColumnId = findColumnId(active.id);
    const toColumnId = findColumnId(over.id);
    if (!fromColumnId || !toColumnId || fromColumnId === toColumnId) return;

    setColumns((prev) => {
      const fromCol = prev.find((c) => c.id === fromColumnId);
      const toCol = prev.find((c) => c.id === toColumnId);
      if (!fromCol || !toCol) return prev;

      const movingTask = fromCol.tasks.find((t) => t.id === active.id);
      if (!movingTask) return prev;

      const overIsColumn = String(over.id) === toColumnId;
      const insertIndex = overIsColumn
        ? toCol.tasks.length
        : toCol.tasks.findIndex((t) => t.id === over.id);

      return prev.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== active.id) };
        }
        if (col.id === toColumnId) {
          const next = [...col.tasks];
          next.splice(insertIndex < 0 ? next.length : insertIndex, 0, movingTask);
          return { ...col, tasks: next };
        }
        return col;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const fromColumnId = findColumnId(active.id);
    const toColumnId = findColumnId(over.id);
    if (!fromColumnId || !toColumnId) return;
    if (fromColumnId !== toColumnId) return; // cross-column moves were finalized in handleDragOver

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id !== fromColumnId) return col;
        const oldIndex = col.tasks.findIndex((t) => t.id === active.id);
        const overIsColumn = String(over.id) === fromColumnId;
        const newIndex = overIsColumn
          ? col.tasks.length - 1
          : col.tasks.findIndex((t) => t.id === over.id);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return col;
        return { ...col, tasks: arrayMove(col.tasks, oldIndex, newIndex) };
      })
    );
  }

  function handleDragCancel() {
    setActiveTask(null);
  }

  return {
    columns,
    activeTask,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
