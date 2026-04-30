import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export default async function ProjectPage({
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

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-6">
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-xs text-zinc-500 hover:text-zinc-900"
        >
          ← Projects
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
        {project.description && (
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">
            {project.description}
          </p>
        )}
      </div>

      <KanbanBoard project={project} />
    </main>
  );
}
