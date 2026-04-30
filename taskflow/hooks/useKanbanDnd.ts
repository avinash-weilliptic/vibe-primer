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
import type { KanbanColumn, KanbanTask } from "@/types/kanban";

const findColumnIdByTaskId = (cols: KanbanColumn[], taskId: string) =>
  cols.find((c) => c.tasks.some((t) => t.id === taskId))?.id;

const findTaskPosition = (cols: KanbanColumn[], taskId: string) => {
  for (const col of cols) {
    const idx = col.tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) return { columnId: col.id, order: idx };
  }
  return null;
};

export type UseKanbanDndOptions = {
  onMove?: (
    taskId: string,
    newColumnId: string,
    newOrder: number,
  ) => Promise<unknown>;
};

export function useKanbanDnd(
  initialColumns: KanbanColumn[],
  options: UseKanbanDndOptions = {},
) {
  const { onMove } = options;
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const columnsRef = useRef<KanbanColumn[]>(initialColumns);
  const snapshotRef = useRef<KanbanColumn[] | null>(null);

  // Mirror the latest committed columns into a ref so handlers that fire
  // back-to-back (onDragOver → onDragEnd) can read truly-current state
  // without waiting for React to re-render.
  const setColumnsTracked = (
    updater: (prev: KanbanColumn[]) => KanbanColumn[],
  ) => {
    setColumns((prev) => {
      const next = updater(prev);
      columnsRef.current = next;
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragStart = (event: DragStartEvent) => {
    snapshotRef.current = columnsRef.current;
    const taskId = event.active.id as string;
    const task = columnsRef.current
      .flatMap((c) => c.tasks)
      .find((t) => t.id === taskId);
    setActiveTask(task ?? null);
  };

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setColumnsTracked((prev) => {
      const fromColId = findColumnIdByTaskId(prev, activeId);
      if (!fromColId) return prev;
      const overType = over.data.current?.type as string | undefined;
      const toColId =
        overType === "column" ? overId : findColumnIdByTaskId(prev, overId);
      if (!toColId || fromColId === toColId) return prev;

      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const fromCol = next.find((c) => c.id === fromColId)!;
      const toCol = next.find((c) => c.id === toColId)!;
      const taskIdx = fromCol.tasks.findIndex((t) => t.id === activeId);
      if (taskIdx === -1) return prev;
      const [moved] = fromCol.tasks.splice(taskIdx, 1);
      const movedNew: KanbanTask = { ...moved, columnId: toColId };

      if (overType === "column") {
        toCol.tasks.push(movedNew);
      } else {
        const overIdx = toCol.tasks.findIndex((t) => t.id === overId);
        toCol.tasks.splice(
          overIdx === -1 ? toCol.tasks.length : overIdx,
          0,
          movedNew,
        );
      }
      return next;
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;

    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId !== overId) {
      setColumnsTracked((prev) => {
        const colId = findColumnIdByTaskId(prev, activeId);
        if (!colId) return prev;
        const overType = over.data.current?.type as string | undefined;
        const overColId =
          overType === "column" ? overId : findColumnIdByTaskId(prev, overId);
        if (colId !== overColId) return prev;
        const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
        const col = next.find((c) => c.id === colId)!;
        const oldIdx = col.tasks.findIndex((t) => t.id === activeId);
        const newIdx = col.tasks.findIndex((t) => t.id === overId);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        col.tasks = arrayMove(col.tasks, oldIdx, newIdx);
        return next;
      });
    }

    if (!onMove || !snapshot) return;

    const before = findTaskPosition(snapshot, activeId);
    const after = findTaskPosition(columnsRef.current, activeId);
    if (!before || !after) return;
    if (before.columnId === after.columnId && before.order === after.order)
      return;

    Promise.resolve(onMove(activeId, after.columnId, after.order)).catch(
      (err) => {
        console.error("moveTask failed; reverting kanban state", err);
        setColumns(snapshot);
        columnsRef.current = snapshot;
      },
    );
  };

  const onDragCancel = () => {
    setActiveTask(null);
    snapshotRef.current = null;
  };

  const addTask = (task: KanbanTask) => {
    setColumnsTracked((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const col = next.find((c) => c.id === task.columnId);
      if (col) col.tasks.push(task);
      return next;
    });
  };

  const patchTask = (
    taskId: string,
    patch: Partial<Pick<KanbanTask, "title" | "description" | "priority">>,
  ) => {
    setColumnsTracked((prev) =>
      prev.map((c) => ({
        ...c,
        tasks: c.tasks.map((t) =>
          t.id === taskId ? { ...t, ...patch } : t,
        ),
      })),
    );
  };

  return {
    columns,
    activeTask,
    sensors,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    addTask,
    patchTask,
  };
}
