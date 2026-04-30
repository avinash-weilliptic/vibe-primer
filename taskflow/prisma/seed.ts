import { PrismaClient, Priority } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.taskLabel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.column.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "Acme Corp", slug: "acme-corp" },
  });

  const projectsSpec = [
    {
      name: "Website Redesign",
      description: "Refresh of the marketing site with a new design system and CMS migration.",
    },
    {
      name: "Mobile App",
      description: "Native iOS and Android client for the Acme product suite.",
    },
  ];

  const labelsSpec = [
    { name: "frontend", color: "#3b82f6" },
    { name: "backend", color: "#10b981" },
    { name: "bug", color: "#ef4444" },
    { name: "design", color: "#a855f7" },
    { name: "infra", color: "#f59e0b" },
  ];

  const columnNames = ["To Do", "In Progress", "Done"];

  for (const spec of projectsSpec) {
    const project = await prisma.project.create({
      data: { ...spec, workspaceId: workspace.id },
    });

    const columns = await Promise.all(
      columnNames.map((name, idx) =>
        prisma.column.create({
          data: { name, order: idx, projectId: project.id },
        }),
      ),
    );

    const labels = await Promise.all(
      labelsSpec.map((l) =>
        prisma.label.create({ data: { ...l, projectId: project.id } }),
      ),
    );

    const tasksSpec: Array<{
      title: string;
      description: string;
      priority: Priority;
      columnIdx: number;
      labelNames: string[];
    }> =
      spec.name === "Website Redesign"
        ? [
            {
              title: "Audit existing site content",
              description: "Inventory all pages and flag content for migration vs. retirement.",
              priority: "LOW",
              columnIdx: 2,
              labelNames: ["design"],
            },
            {
              title: "Design new component library",
              description: "Define tokens, primitives, and Figma component set.",
              priority: "HIGH",
              columnIdx: 1,
              labelNames: ["design", "frontend"],
            },
            {
              title: "Migrate blog to new CMS",
              description: "Move ~120 blog posts and redirect old URLs.",
              priority: "MEDIUM",
              columnIdx: 0,
              labelNames: ["backend", "infra"],
            },
            {
              title: "Fix layout shift on hero",
              description: "CLS regression on landing page above the fold.",
              priority: "URGENT",
              columnIdx: 1,
              labelNames: ["bug", "frontend"],
            },
            {
              title: "Set up preview deployments",
              description: "Vercel preview env per PR with seeded CMS content.",
              priority: "MEDIUM",
              columnIdx: 0,
              labelNames: ["infra"],
            },
          ]
        : [
            {
              title: "Spike: React Native vs Expo",
              description: "Decide on framework and write up tradeoffs.",
              priority: "HIGH",
              columnIdx: 2,
              labelNames: ["frontend"],
            },
            {
              title: "Build auth flow",
              description: "Email + OAuth, with biometric unlock on relaunch.",
              priority: "HIGH",
              columnIdx: 1,
              labelNames: ["frontend", "backend"],
            },
            {
              title: "Push notification infra",
              description: "APNs + FCM behind a single send API.",
              priority: "MEDIUM",
              columnIdx: 0,
              labelNames: ["backend", "infra"],
            },
            {
              title: "Crash on cold start (Android 14)",
              description: "Stack trace points to a native module init race.",
              priority: "URGENT",
              columnIdx: 1,
              labelNames: ["bug"],
            },
            {
              title: "Onboarding screens v1",
              description: "Three-screen carousel with skip and progress dots.",
              priority: "LOW",
              columnIdx: 0,
              labelNames: ["design", "frontend"],
            },
          ];

    for (let order = 0; order < tasksSpec.length; order++) {
      const t = tasksSpec[order];
      await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          priority: t.priority,
          order,
          columnId: columns[t.columnIdx].id,
          projectId: project.id,
          labels: {
            create: t.labelNames.map((name: string) => ({
              label: { connect: { id: labels.find((l) => l.name === name)!.id } },
            })),
          },
        },
      });
    }
  }

  const counts = {
    workspaces: await prisma.workspace.count(),
    projects: await prisma.project.count(),
    columns: await prisma.column.count(),
    tasks: await prisma.task.count(),
    labels: await prisma.label.count(),
    taskLabels: await prisma.taskLabel.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
