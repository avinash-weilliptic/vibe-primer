import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  KanbanBoard,
  type KanbanProject,
} from "@/components/kanban/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function ProjectKanbanPage({
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
            include: { labels: { include: { label: true } } },
          },
        },
      },
    },
  });

  if (!project) notFound();

  const data: KanbanProject = {
    id: project.id,
    name: project.name,
    description: project.description,
    columns: project.columns.map((c) => ({
      id: c.id,
      name: c.name,
      order: c.order,
      tasks: c.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        order: t.order,
        labels: t.labels.map((tl) => ({
          id: tl.label.id,
          name: tl.label.name,
          color: tl.label.color,
        })),
      })),
    })),
  };

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Projects
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-gray-600">{project.description}</p>
        )}
      </header>
      <KanbanBoard project={data} />
    </div>
  );
}
