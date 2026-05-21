"use server";

import type { Priority } from "@prisma/client";
import { db } from "@/lib/db";
import type { TaskCardData } from "@/types/kanban";

/**
 * Move a task to a column at a given position.
 *
 * Note: this updates only the dragged task's `columnId`/`order`. Sibling
 * tasks keep their existing `order` values, so ordering can drift over many
 * moves — a future `reorderColumn` action should renumber a whole column.
 */
export async function moveTask(
  taskId: string,
  newColumnId: string,
  newOrder: number,
): Promise<void> {
  await db.task.update({
    where: { id: taskId },
    data: { columnId: newColumnId, order: newOrder },
  });
}

/** Create a task appended to the end of the given column. */
export async function createTask(
  projectId: string,
  columnId: string,
  title: string,
  priority: Priority,
): Promise<TaskCardData> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Task title cannot be empty.");
  }

  const count = await db.task.count({ where: { columnId } });
  const task = await db.task.create({
    data: {
      projectId,
      columnId,
      title: trimmed,
      priority,
      order: count,
    },
  });

  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    labels: [],
  };
}

/** Permanently delete a task. */
export async function deleteTask(taskId: string): Promise<void> {
  await db.task.delete({ where: { id: taskId } });
}

/** Update a task's editable fields. Omitted fields are left unchanged. */
export async function updateTask(
  taskId: string,
  fields: {
    title?: string;
    description?: string | null;
    priority?: Priority;
  },
): Promise<void> {
  const data: {
    title?: string;
    description?: string | null;
    priority?: Priority;
  } = {};

  if (fields.title !== undefined) {
    const trimmed = fields.title.trim();
    if (!trimmed) throw new Error("Task title cannot be empty.");
    data.title = trimmed;
  }
  if (fields.description !== undefined) data.description = fields.description;
  if (fields.priority !== undefined) data.priority = fields.priority;

  await db.task.update({ where: { id: taskId }, data });
}
