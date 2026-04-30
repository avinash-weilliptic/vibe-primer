// Smoke test: drives lib/actions/tasks.ts directly against the dev DB.
// Run: npx ts-node scripts/test-task-actions.ts
// Restores state by re-running the seed at the end.

import { PrismaClient } from "@prisma/client";
import {
  createTask as _createTask,
  deleteTask as _deleteTask,
  moveTask as _moveTask,
  updateTask as _updateTask,
} from "../lib/actions/tasks";

// next/cache's revalidatePath requires Next's static generation store. When
// driving server actions from a plain ts-node script the DB writes complete
// fine but revalidatePath throws afterward. Swallow only that specific error.
const ignoreOutOfNextRevalidate = async <T>(p: Promise<T>): Promise<T | undefined> => {
  try {
    return await p;
  } catch (e) {
    if (String(e).includes("static generation store missing")) return undefined;
    throw e;
  }
};
const moveTask: typeof _moveTask = (id, c, o) => ignoreOutOfNextRevalidate(_moveTask(id, c, o)) as ReturnType<typeof _moveTask>;
const deleteTask: typeof _deleteTask = (id) => ignoreOutOfNextRevalidate(_deleteTask(id)) as ReturnType<typeof _deleteTask>;
const updateTask: typeof _updateTask = (id, f) => ignoreOutOfNextRevalidate(_updateTask(id, f)) as ReturnType<typeof _updateTask>;
const createTask: typeof _createTask = async (p, c, t, pr) => {
  // For createTask the return value is needed; the revalidate happens after the create() call, so the row exists even if revalidate throws.
  try {
    return await _createTask(p, c, t, pr);
  } catch (e) {
    if (String(e).includes("static generation store missing")) {
      const created = await prisma.task.findFirst({ where: { columnId: c, title: t.trim() }, orderBy: { createdAt: "desc" }, include: { labels: { include: { label: true } } } });
      if (!created) throw e;
      return created;
    }
    throw e;
  }
};

const prisma = new PrismaClient();

const fmt = (rows: { id: string; title: string; order: number; columnId: string }[]) =>
  rows.map((r) => `[${r.order}] ${r.title.slice(0, 25)} (col=${r.columnId.slice(-6)})`).join("\n  ");

async function main() {
  const project = await prisma.project.findFirst({
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: { tasks: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!project) throw new Error("no projects in DB; run prisma db seed first");

  const [todo, inProgress, done] = project.columns;
  console.log(`# Project: ${project.name}`);
  console.log(`# Columns: ${todo.name} / ${inProgress.name} / ${done.name}`);

  // --- moveTask: same column reorder ---
  const firstTodo = todo.tasks[0];
  const beforeOrder = firstTodo.order;
  console.log(`\n[moveTask same-col] move "${firstTodo.title.slice(0, 30)}" from order ${beforeOrder} → end of ${todo.name}`);
  await moveTask(firstTodo.id, todo.id, todo.tasks.length - 1);
  const todoAfter = await prisma.task.findMany({ where: { columnId: todo.id }, orderBy: { order: "asc" } });
  console.log(`  result:\n  ${fmt(todoAfter)}`);
  if (todoAfter[todoAfter.length - 1].id !== firstTodo.id) throw new Error("same-col move failed");
  const orders = todoAfter.map((t) => t.order);
  const expected = orders.map((_, i) => i);
  if (JSON.stringify(orders) !== JSON.stringify(expected)) throw new Error(`orders not contiguous: ${orders}`);
  console.log("  ✓ task at end, orders contiguous 0..N-1");

  // --- moveTask: cross-column ---
  const someTask = todoAfter[0];
  console.log(`\n[moveTask cross-col] move "${someTask.title.slice(0, 30)}" from ${todo.name} → ${done.name} at index 1`);
  await moveTask(someTask.id, done.id, 1);
  const [todoNew, doneNew] = await Promise.all([
    prisma.task.findMany({ where: { columnId: todo.id }, orderBy: { order: "asc" } }),
    prisma.task.findMany({ where: { columnId: done.id }, orderBy: { order: "asc" } }),
  ]);
  if (todoNew.find((t) => t.id === someTask.id)) throw new Error("task still in source column");
  if (doneNew[1].id !== someTask.id) throw new Error(`task not at index 1; at ${doneNew.findIndex((t) => t.id === someTask.id)}`);
  if (JSON.stringify(todoNew.map((t) => t.order)) !== JSON.stringify(todoNew.map((_, i) => i))) throw new Error("source not renumbered");
  if (JSON.stringify(doneNew.map((t) => t.order)) !== JSON.stringify(doneNew.map((_, i) => i))) throw new Error("dest not renumbered");
  console.log(`  source after:\n  ${fmt(todoNew)}`);
  console.log(`  dest after:\n  ${fmt(doneNew)}`);
  console.log("  ✓ task moved, both columns renumbered contiguously");

  // --- createTask ---
  console.log(`\n[createTask] add "Smoke test task" to ${inProgress.name} as URGENT`);
  const created = await createTask(project.id, inProgress.id, "Smoke test task", "URGENT");
  if (created.priority !== "URGENT") throw new Error("priority wrong");
  if (created.columnId !== inProgress.id) throw new Error("column wrong");
  console.log(`  ✓ created id=${created.id.slice(-6)} order=${created.order} priority=${created.priority}`);

  // --- updateTask ---
  console.log(`\n[updateTask] retitle + change priority to LOW`);
  await updateTask(created.id, { title: "Smoke test task (renamed)", priority: "LOW", description: "test description" });
  const updated = await prisma.task.findUnique({ where: { id: created.id } });
  if (updated?.title !== "Smoke test task (renamed)") throw new Error(`title wrong: ${updated?.title}`);
  if (updated?.priority !== "LOW") throw new Error(`priority wrong: ${updated?.priority}`);
  if (updated?.description !== "test description") throw new Error(`description wrong: ${updated?.description}`);
  console.log(`  ✓ title="${updated.title}" priority=${updated.priority} desc="${updated.description}"`);

  // --- deleteTask ---
  console.log(`\n[deleteTask] delete the task we created`);
  await deleteTask(created.id);
  const gone = await prisma.task.findUnique({ where: { id: created.id } });
  if (gone) throw new Error("task still present after delete");
  console.log(`  ✓ task deleted`);

  console.log("\nALL OK");
}

main()
  .catch((e) => {
    console.error("FAIL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
