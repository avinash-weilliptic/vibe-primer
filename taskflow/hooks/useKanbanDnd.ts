"use client";

import { useRef, useState } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { moveTask } from "@/lib/actions/tasks";
import type {
  KanbanColumn,
  KanbanTask,
} from "@/components/kanban/KanbanBoard";

function findContainerId(
  id: string,
  columns: KanbanColumn[],
): string | undefined {
  if (columns.some((c) => c.id === id)) return id;
  return columns.find((c) => c.tasks.some((t) => t.id === id))?.id;
}

export function useKanbanDnd(initialColumns: KanbanColumn[]) {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const dragOriginRef = useRef<KanbanColumn[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    dragOriginRef.current = columns;
    for (const col of columns) {
      const task = col.tasks.find((t) => t.id === id);
      if (task) {
        setActiveTask(task);
        return;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    setColumns((prev) => {
      const activeContainerId = findContainerId(activeId, prev);
      const overContainerId = findContainerId(overId, prev);
      if (
        !activeContainerId ||
        !overContainerId ||
        activeContainerId === overContainerId
      ) {
        return prev;
      }

      const activeCol = prev.find((c) => c.id === activeContainerId);
      const task = activeCol?.tasks.find((t) => t.id === activeId);
      if (!task) return prev;

      const overIsColumn = prev.some((c) => c.id === overId);

      return prev.map((col) => {
        if (col.id === activeContainerId) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.id !== activeId),
          };
        }
        if (col.id === overContainerId) {
          if (overIsColumn) {
            return { ...col, tasks: [...col.tasks, task] };
          }
          const overIdx = col.tasks.findIndex((t) => t.id === overId);
          const next = [...col.tasks];
          next.splice(overIdx >= 0 ? overIdx : next.length, 0, task);
          return { ...col, tasks: next };
        }
        return col;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;

    if (!over || !origin) {
      if (origin) setColumns(origin);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainerId = findContainerId(activeId, columns);
    const overContainerId = findContainerId(overId, columns);
    if (!activeContainerId || !overContainerId) return;

    let next = columns;
    if (activeContainerId === overContainerId && activeId !== overId) {
      next = columns.map((col) => {
        if (col.id !== activeContainerId) return col;
        const oldIdx = col.tasks.findIndex((t) => t.id === activeId);
        const newIdx = col.tasks.findIndex((t) => t.id === overId);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return col;
        return { ...col, tasks: arrayMove(col.tasks, oldIdx, newIdx) };
      });
      setColumns(next);
    }

    const finalCol = next.find((c) => c.tasks.some((t) => t.id === activeId));
    if (!finalCol) return;
    const finalIdx = finalCol.tasks.findIndex((t) => t.id === activeId);

    const originCol = origin.find((c) =>
      c.tasks.some((t) => t.id === activeId),
    );
    const originIdx =
      originCol?.tasks.findIndex((t) => t.id === activeId) ?? -1;
    if (originCol?.id === finalCol.id && originIdx === finalIdx) return;

    moveTask(activeId, finalCol.id, finalIdx).catch((err) => {
      console.error("moveTask failed; reverting:", err);
      setColumns(origin);
    });
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;
    if (origin) setColumns(origin);
  };

  return {
    columns,
    setColumns,
    activeTask,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
