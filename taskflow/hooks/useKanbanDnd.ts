"use client";

import { useRef, useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Priority } from "@prisma/client";
import { createTask, moveTask } from "@/lib/actions/tasks";
import type { ColumnData, TaskCardData } from "@/types/kanban";

/**
 * Owns the Kanban board's column/task state and wires up @dnd-kit event
 * handlers for dragging task cards within and between columns.
 *
 * Drops update local state immediately (optimistic) and then persist via the
 * `moveTask` server action; a failed write reverts to the pre-drag snapshot.
 */
export function useKanbanDnd(initialColumns: ColumnData[], projectId: string) {
  const [columns, setColumns] = useState<ColumnData[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<TaskCardData | null>(null);

  // Snapshot of the board taken when a drag starts, used to revert on a
  // failed persist or a cancelled drag.
  const snapshotRef = useRef<ColumnData[] | null>(null);

  // A small drag threshold so plain clicks on a card aren't read as drags.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    snapshotRef.current = columns;
    for (const column of columns) {
      const task = column.tasks.find((t) => t.id === id);
      if (task) {
        setActiveTask(task);
        return;
      }
    }
  }

  /**
   * Fires continuously while dragging. When the card crosses into a different
   * column we move it there immediately so the board reflects the drop target
   * in real time. Same-column reordering is deferred to onDragEnd.
   */
  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const overIsColumn = over.data.current?.type === "column";

    setColumns((prev) => {
      const activeCol = prev.find((c) =>
        c.tasks.some((t) => t.id === activeId),
      );
      if (!activeCol) return prev;

      const overCol = overIsColumn
        ? prev.find((c) => c.id === overId)
        : prev.find((c) => c.tasks.some((t) => t.id === overId));
      if (!overCol || activeCol.id === overCol.id) return prev;

      const task = activeCol.tasks.find((t) => t.id === activeId);
      if (!task) return prev;

      const overIndex = overIsColumn
        ? overCol.tasks.length
        : overCol.tasks.findIndex((t) => t.id === overId);
      const insertAt = overIndex < 0 ? overCol.tasks.length : overIndex;

      return prev.map((col) => {
        if (col.id === activeCol.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) };
        }
        if (col.id === overCol.id) {
          const tasks = [...col.tasks];
          tasks.splice(insertAt, 0, task);
          return { ...col, tasks };
        }
        return col;
      });
    });
  }

  /**
   * Finalises the drag: settles same-column reordering, then persists the
   * dragged task's final column + position. Reverts on a failed write.
   */
  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    const snapshot = snapshotRef.current;
    snapshotRef.current = null;

    const draggedId = String(active.id);

    // Cross-column moves were already applied by onDragOver; here we only
    // settle reordering within the destination column.
    let settled = columns;
    if (over && draggedId !== String(over.id)) {
      const overId = String(over.id);
      const activeCol = columns.find((c) =>
        c.tasks.some((t) => t.id === draggedId),
      );
      const overCol =
        over.data.current?.type === "column"
          ? columns.find((c) => c.id === overId)
          : columns.find((c) => c.tasks.some((t) => t.id === overId));

      if (activeCol && overCol && activeCol.id === overCol.id) {
        const oldIndex = activeCol.tasks.findIndex((t) => t.id === draggedId);
        const newIndex = activeCol.tasks.findIndex((t) => t.id === overId);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          settled = columns.map((c) =>
            c.id === activeCol.id
              ? { ...c, tasks: arrayMove(c.tasks, oldIndex, newIndex) }
              : c,
          );
          setColumns(settled);
        }
      }
    }

    // Locate the dragged task's final resting place.
    const finalCol = settled.find((c) =>
      c.tasks.some((t) => t.id === draggedId),
    );
    if (!finalCol) return;
    const finalOrder = finalCol.tasks.findIndex((t) => t.id === draggedId);

    // Skip the DB write if the card was dropped back where it started.
    if (snapshot) {
      const origCol = snapshot.find((c) =>
        c.tasks.some((t) => t.id === draggedId),
      );
      const origOrder = origCol?.tasks.findIndex((t) => t.id === draggedId);
      if (origCol && origCol.id === finalCol.id && origOrder === finalOrder) {
        return;
      }
    }

    // Persist optimistically — revert to the pre-drag snapshot on failure.
    moveTask(draggedId, finalCol.id, finalOrder).catch((error) => {
      console.error("Failed to persist task move; reverting.", error);
      if (snapshot) setColumns(snapshot);
    });
  }

  function onDragCancel() {
    setActiveTask(null);
    if (snapshotRef.current) {
      setColumns(snapshotRef.current);
      snapshotRef.current = null;
    }
  }

  /**
   * Create a task in a column via the server action, then append the saved
   * row to local state. Throws on failure so the caller can surface an error.
   */
  async function addTask(
    columnId: string,
    title: string,
    priority: Priority,
  ): Promise<TaskCardData> {
    const created = await createTask(projectId, columnId, title, priority);
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId
          ? { ...col, tasks: [...col.tasks, created] }
          : col,
      ),
    );
    return created;
  }

  return {
    columns,
    activeTask,
    sensors,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    addTask,
  };
}
