import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      {projects.length === 0 ? (
        <p className="text-sm text-gray-500">
          No projects yet. Run <code>npx prisma db seed</code> to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block rounded-lg border border-gray-200 p-5 transition hover:border-gray-400 hover:shadow-sm"
            >
              <h2 className="text-lg font-medium">{p.name}</h2>
              {p.description && (
                <p className="mt-1 text-sm text-gray-600">{p.description}</p>
              )}
              <p className="mt-3 text-xs text-gray-500">
                {p._count.tasks} {p._count.tasks === 1 ? "task" : "tasks"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
