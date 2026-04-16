import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              labels: {
                include: { label: true },
              },
            },
          },
        },
      },
    },
  });
  return project;
}

export default async function ProjectPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProject(params.id);

  if (!project) {
    notFound();
  }

  const columns = project.columns.map((col) => ({
    id: col.id,
    name: col.name,
    order: col.order,
    tasks: col.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      order: task.order,
      labels: task.labels.map((tl) => ({
        id: tl.label.id,
        name: tl.label.name,
        color: tl.label.color,
      })),
    })),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4 px-6 py-4">
          <Link href="/projects" className="text-xl font-bold">
            TaskFlow
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
            {project.name}
          </span>
        </div>
      </nav>

      <main className="flex-1 overflow-x-auto p-6">
        <KanbanBoard columns={columns} />
      </main>
    </div>
  );
}
