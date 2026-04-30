"use server";

import { revalidatePath } from "next/cache";
import type { Prisma, Priority } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function moveTask(
  taskId: string,
  newColumnId: string,
  newOrder: number,
) {
  const projectId = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({ where: { id: taskId } });
    const oldColumnId = task.columnId;

    if (oldColumnId === newColumnId) {
      const others = await tx.task.findMany({
        where: { columnId: newColumnId, NOT: { id: taskId } },
        orderBy: { order: "asc" },
      });
      const clamped = Math.max(0, Math.min(newOrder, others.length));
      const reordered = [...others];
      reordered.splice(clamped, 0, task);
      await Promise.all(
        reordered.map((t, idx) =>
          tx.task.update({ where: { id: t.id }, data: { order: idx } }),
        ),
      );
    } else {
      const sourceTasks = await tx.task.findMany({
        where: { columnId: oldColumnId, NOT: { id: taskId } },
        orderBy: { order: "asc" },
      });
      const destTasks = await tx.task.findMany({
        where: { columnId: newColumnId },
        orderBy: { order: "asc" },
      });
      const clamped = Math.max(0, Math.min(newOrder, destTasks.length));
      const newDest = [...destTasks];
      newDest.splice(clamped, 0, task);

      await Promise.all([
        ...sourceTasks.map((t, idx) =>
          tx.task.update({ where: { id: t.id }, data: { order: idx } }),
        ),
        ...newDest.map((t, idx) =>
          tx.task.update({
            where: { id: t.id },
            data:
              t.id === taskId
                ? { order: idx, columnId: newColumnId }
                : { order: idx },
          }),
        ),
      ]);
    }

    return task.projectId;
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function createTask(
  projectId: string,
  columnId: string,
  title: string,
  priority: Priority = "MEDIUM",
) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Task title is required");

  const lastTask = await prisma.task.findFirst({
    where: { columnId },
    orderBy: { order: "desc" },
  });
  const nextOrder = lastTask ? lastTask.order + 1 : 0;

  const task = await prisma.task.create({
    data: {
      title: trimmed,
      priority,
      order: nextOrder,
      columnId,
      projectId,
    },
    include: { labels: { include: { label: true } } },
  });

  revalidatePath(`/projects/${projectId}`);
  return task;
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/projects/${task.projectId}`);
}

export type TaskUpdateFields = {
  title?: string;
  description?: string | null;
  priority?: Priority;
};

export async function updateTask(taskId: string, fields: TaskUpdateFields) {
  const data: Prisma.TaskUpdateInput = {};
  if (fields.title !== undefined) {
    const trimmed = fields.title.trim();
    if (!trimmed) throw new Error("Task title cannot be empty");
    data.title = trimmed;
  }
  if (fields.description !== undefined) data.description = fields.description;
  if (fields.priority !== undefined) data.priority = fields.priority;

  const task = await prisma.task.update({ where: { id: taskId }, data });
  revalidatePath(`/projects/${task.projectId}`);
}
