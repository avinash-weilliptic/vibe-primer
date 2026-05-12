import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      workspace: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-slate-600">
          {projects.length} project{projects.length === 1 ? "" : "s"} across your
          workspaces.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No projects yet. Run <code className="font-mono">npx prisma db seed</code>{" "}
          to populate sample data.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block h-full rounded-lg border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium text-slate-900">{project.name}</h2>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {project._count.tasks} task
                    {project._count.tasks === 1 ? "" : "s"}
                  </span>
                </div>
                {project.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {project.description}
                  </p>
                )}
                <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
                  {project.workspace.name}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
