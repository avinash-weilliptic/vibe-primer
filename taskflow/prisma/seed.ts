import { PrismaClient, Priority } from "@prisma/client";

const prisma = new PrismaClient();

const COLUMN_NAMES = ["To Do", "In Progress", "Done"] as const;

async function main() {
  // Wipe existing rows so the seed is idempotent (re-runnable).
  await prisma.taskLabel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.column.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: { name: "Acme Corp", slug: "acme-corp" },
  });

  const website = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Revamp the marketing site with a fresh brand identity.",
      workspaceId: workspace.id,
      columns: {
        create: COLUMN_NAMES.map((name, order) => ({ name, order })),
      },
      labels: {
        create: [
          { name: "Design", color: "#a855f7" },
          { name: "Frontend", color: "#3b82f6" },
          { name: "Bug", color: "#ef4444" },
        ],
      },
    },
    include: {
      columns: { orderBy: { order: "asc" } },
      labels: true,
    },
  });

  const mobile = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "Ship the iOS and Android companion app.",
      workspaceId: workspace.id,
      columns: {
        create: COLUMN_NAMES.map((name, order) => ({ name, order })),
      },
      labels: {
        create: [
          { name: "Bug", color: "#ef4444" },
          { name: "Backend", color: "#22c55e" },
          { name: "Feature", color: "#f59e0b" },
        ],
      },
    },
    include: {
      columns: { orderBy: { order: "asc" } },
      labels: true,
    },
  });

  const labelId = (
    project: typeof website | typeof mobile,
    name: string,
  ): string => {
    const label = project.labels.find((l) => l.name === name);
    if (!label) throw new Error(`Label "${name}" not found`);
    return label.id;
  };

  // 5 tasks spread across both projects' columns, with varied priorities.
  // columns[0] = To Do, columns[1] = In Progress, columns[2] = Done.
  const tasks = [
    {
      title: "Audit current site content",
      description: "Catalogue every page and flag what to keep, cut, or rewrite.",
      priority: Priority.LOW,
      order: 0,
      columnId: website.columns[2].id,
      projectId: website.id,
      labelIds: [labelId(website, "Design")],
    },
    {
      title: "Design new homepage",
      description: "High-fidelity mockup of the hero, features, and footer.",
      priority: Priority.HIGH,
      order: 0,
      columnId: website.columns[1].id,
      projectId: website.id,
      labelIds: [labelId(website, "Design"), labelId(website, "Frontend")],
    },
    {
      title: "Build reusable component library",
      description: "Buttons, cards, and form controls in the new design system.",
      priority: Priority.MEDIUM,
      order: 0,
      columnId: website.columns[0].id,
      projectId: website.id,
      labelIds: [labelId(website, "Frontend")],
    },
    {
      title: "Fix login crash on Android 14",
      description: "App force-closes on the OAuth callback for some devices.",
      priority: Priority.URGENT,
      order: 0,
      columnId: mobile.columns[1].id,
      projectId: mobile.id,
      labelIds: [labelId(mobile, "Bug")],
    },
    {
      title: "Set up CI pipeline",
      description: "Automated builds and tests for every pull request.",
      priority: Priority.MEDIUM,
      order: 0,
      columnId: mobile.columns[0].id,
      projectId: mobile.id,
      labelIds: [labelId(mobile, "Backend"), labelId(mobile, "Feature")],
    },
  ];

  for (const { labelIds, ...task } of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        labels: {
          create: labelIds.map((id) => ({ labelId: id })),
        },
      },
    });
  }

  console.log(
    `Seeded: 1 workspace, 2 projects, ${2 * COLUMN_NAMES.length} columns, ${tasks.length} tasks.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
