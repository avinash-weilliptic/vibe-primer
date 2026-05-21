import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        {projects.length} {projects.length === 1 ? "project" : "projects"}
      </p>

      {projects.length === 0 ? (
        <p className="mt-10 text-sm text-black/60 dark:text-white/60">
          No projects yet. Run <code>npx prisma db seed</code> to add some.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-lg border border-black/10 p-5 transition-colors hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
            >
              <h2 className="font-medium">{project.name}</h2>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-sm text-black/60 dark:text-white/60">
                  {project.description}
                </p>
              )}
              <p className="mt-4 text-xs font-medium text-black/50 dark:text-white/50">
                {project._count.tasks}{" "}
                {project._count.tasks === 1 ? "task" : "tasks"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
