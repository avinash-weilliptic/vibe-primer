import Link from "next/link";
import { prisma } from "@/lib/db";

async function getProjects() {
  return prisma.project.findMany({
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            TaskFlow
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="mb-8 text-2xl font-bold">Projects</h1>

        {projects.length === 0 ? (
          <p className="text-gray-500">No projects yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <h2 className="text-lg font-semibold">{project.name}</h2>
                {project.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {project.description}
                  </p>
                )}
                <p className="mt-4 text-sm text-gray-500">
                  {project._count.tasks}{" "}
                  {project._count.tasks === 1 ? "task" : "tasks"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
