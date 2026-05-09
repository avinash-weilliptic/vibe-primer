import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <span className="text-sm text-gray-500">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </span>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500">No projects yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block h-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow"
              >
                <h2 className="text-lg font-medium">{project.name}</h2>
                {project.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {project.description}
                  </p>
                )}
                <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">
                  {project._count.tasks}{" "}
                  {project._count.tasks === 1 ? "task" : "tasks"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
