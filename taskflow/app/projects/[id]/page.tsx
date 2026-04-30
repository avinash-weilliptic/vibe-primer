import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  KanbanBoard,
  type KanbanColumn,
} from "@/components/kanban/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function ProjectKanbanPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await prisma.project.findUnique({
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

  const columns: KanbanColumn[] = project.columns.map((column) => ({
    id: column.id,
    name: column.name,
    tasks: column.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      labels: task.labels.map((tl) => ({
        id: tl.label.id,
        name: tl.label.name,
        color: tl.label.color,
      })),
    })),
  }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3 text-sm text-gray-500">
        <Link href="/projects" className="hover:text-gray-900">
          Projects
        </Link>
        <span>/</span>
        <span className="text-gray-900">{project.name}</span>
      </div>
      <h1 className="mb-6 text-2xl font-semibold">{project.name}</h1>
      <KanbanBoard projectId={project.id} columns={columns} />
    </main>
  );
}
