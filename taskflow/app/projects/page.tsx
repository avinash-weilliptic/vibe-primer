import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="text-sm text-zinc-500">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </p>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No projects yet. Run <code className="font-mono">npx prisma db seed</code> to populate sample data.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 hover:shadow-sm"
            >
              <h2 className="text-base font-medium text-zinc-900">{project.name}</h2>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                  {project.description}
                </p>
              )}
              <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {project._count.tasks} {project._count.tasks === 1 ? "task" : "tasks"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
