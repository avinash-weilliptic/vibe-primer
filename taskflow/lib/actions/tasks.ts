"use server";

import { revalidatePath } from "next/cache";
import type { Priority } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function moveTask(
  taskId: string,
  newColumnId: string,
  newOrder: number,
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: { columnId: newColumnId, order: newOrder },
    select: { projectId: true },
  });
  revalidatePath(`/projects/${task.projectId}`);
}

export async function createTask(
  projectId: string,
  columnId: string,
  title: string,
  priority: Priority,
) {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");

  const last = await prisma.task.findFirst({
    where: { columnId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? -1) + 1;

  const task = await prisma.task.create({
    data: { projectId, columnId, title: trimmed, priority, order },
    select: { id: true, title: true, description: true, priority: true },
  });

  revalidatePath(`/projects/${projectId}`);

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    labels: [],
  };
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.delete({
    where: { id: taskId },
    select: { projectId: true },
  });
  revalidatePath(`/projects/${task.projectId}`);
}

export async function updateTask(
  taskId: string,
  fields: {
    title?: string;
    description?: string | null;
    priority?: Priority;
  },
) {
  const task = await prisma.task.update({
    where: { id: taskId },
    data: fields,
    select: { projectId: true },
  });
  revalidatePath(`/projects/${task.projectId}`);
}
