import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              labels: { include: { label: true } },
            },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const columns = project.columns.map((column) => ({
    id: column.id,
    name: column.name,
    tasks: column.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      labels: task.labels.map((taskLabel) => ({
        id: taskLabel.label.id,
        name: taskLabel.label.name,
        color: taskLabel.label.color,
      })),
    })),
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/projects"
        className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        ← Projects
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {project.name}
      </h1>
      {project.description && (
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {project.description}
        </p>
      )}

      <div className="mt-8">
        <KanbanBoard columns={columns} projectId={project.id} />
      </div>
    </main>
  );
}
