import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function ProjectBoardPage({
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-slate-600">{project.description}</p>
        )}
      </div>
      <KanbanBoard columns={project.columns} />
    </div>
  );
}
