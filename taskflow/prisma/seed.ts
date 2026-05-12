import { PrismaClient } from "@prisma/client";

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

  const website = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Refresh the marketing site and component library.",
      workspaceId: workspace.id,
    },
  });

  const mobile = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "Native iOS and Android client for the platform.",
      workspaceId: workspace.id,
    },
  });

  const COLUMN_NAMES = ["To Do", "In Progress", "Done"] as const;

  const websiteCols = await Promise.all(
    COLUMN_NAMES.map((name, order) =>
      prisma.column.create({
        data: { name, order, projectId: website.id },
      }),
    ),
  );
  const mobileCols = await Promise.all(
    COLUMN_NAMES.map((name, order) =>
      prisma.column.create({
        data: { name, order, projectId: mobile.id },
      }),
    ),
  );

  const [websiteTodo, websiteDoing] = websiteCols;
  const [mobileTodo, , mobileDone] = mobileCols;

  const websiteLabels = await Promise.all(
    [
      { name: "frontend", color: "#3b82f6" },
      { name: "design", color: "#a855f7" },
      { name: "bug", color: "#ef4444" },
    ].map((l) =>
      prisma.label.create({ data: { ...l, projectId: website.id } }),
    ),
  );
  const mobileLabels = await Promise.all(
    [
      { name: "ios", color: "#64748b" },
      { name: "backend", color: "#22c55e" },
    ].map((l) => prisma.label.create({ data: { ...l, projectId: mobile.id } })),
  );

  const [lblFrontend, lblDesign, lblBug] = websiteLabels;
  const [lblIos, lblBackend] = mobileLabels;

  await prisma.task.create({
    data: {
      title: "Audit current homepage",
      description: "Catalog every section and flag what to keep vs. cut.",
      priority: "HIGH",
      order: 0,
      columnId: websiteTodo.id,
      projectId: website.id,
      labels: { create: [{ labelId: lblDesign.id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Implement responsive nav",
      description: "Mobile-first nav with collapsible menu.",
      priority: "URGENT",
      order: 0,
      columnId: websiteDoing.id,
      projectId: website.id,
      labels: {
        create: [{ labelId: lblFrontend.id }, { labelId: lblDesign.id }],
      },
    },
  });

  await prisma.task.create({
    data: {
      title: "Fix Safari rendering bug",
      description: "Sticky header jitters on scroll in Safari 17.",
      priority: "MEDIUM",
      order: 1,
      columnId: websiteDoing.id,
      projectId: website.id,
      labels: {
        create: [{ labelId: lblBug.id }, { labelId: lblFrontend.id }],
      },
    },
  });

  await prisma.task.create({
    data: {
      title: "Set up CI pipeline",
      description: "GitHub Actions for lint, test, and build on every PR.",
      priority: "LOW",
      order: 0,
      columnId: mobileDone.id,
      projectId: mobile.id,
      labels: { create: [{ labelId: lblBackend.id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "iOS push notifications",
      description: "Wire APNs and add user preference toggle.",
      priority: "HIGH",
      order: 0,
      columnId: mobileTodo.id,
      projectId: mobile.id,
      labels: {
        create: [{ labelId: lblIos.id }, { labelId: lblBackend.id }],
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
