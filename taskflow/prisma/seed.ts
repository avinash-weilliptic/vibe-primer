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
      description: "Refresh the marketing site with new branding and CMS.",
      workspaceId: workspace.id,
      columns: {
        create: [
          { name: "To Do", order: 0 },
          { name: "In Progress", order: 1 },
          { name: "Done", order: 2 },
        ],
      },
      labels: {
        create: [
          { name: "design", color: "#3b82f6" },
          { name: "frontend", color: "#8b5cf6" },
        ],
      },
    },
    include: { columns: true, labels: true },
  });

  const mobile = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "Native iOS and Android apps for customer self-service.",
      workspaceId: workspace.id,
      columns: {
        create: [
          { name: "To Do", order: 0 },
          { name: "In Progress", order: 1 },
          { name: "Done", order: 2 },
        ],
      },
      labels: {
        create: [
          { name: "mobile", color: "#10b981" },
          { name: "ios", color: "#6b7280" },
        ],
      },
    },
    include: { columns: true, labels: true },
  });

  const col = (
    project: typeof website,
    name: "To Do" | "In Progress" | "Done"
  ) => project.columns.find((c) => c.name === name)!;

  const lbl = (project: typeof website, name: string) =>
    project.labels.find((l) => l.name === name)!;

  await prisma.task.create({
    data: {
      title: "Audit current site analytics",
      description: "Review GA4 and Hotjar to identify drop-off points.",
      priority: "HIGH",
      order: 0,
      columnId: col(website, "To Do").id,
      projectId: website.id,
      labels: { create: [{ labelId: lbl(website, "design").id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Implement new homepage hero",
      description: "Build the hero section per Figma spec.",
      priority: "URGENT",
      order: 0,
      columnId: col(website, "In Progress").id,
      projectId: website.id,
      labels: { create: [{ labelId: lbl(website, "frontend").id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Finalize brand color palette",
      description: "Locked in primary, secondary, and accent colors.",
      priority: "MEDIUM",
      order: 0,
      columnId: col(website, "Done").id,
      projectId: website.id,
      labels: { create: [{ labelId: lbl(website, "design").id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Scope offline mode requirements",
      description: "Decide which screens must work without connectivity.",
      priority: "LOW",
      order: 0,
      columnId: col(mobile, "To Do").id,
      projectId: mobile.id,
      labels: { create: [{ labelId: lbl(mobile, "mobile").id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Wire up iOS push notifications",
      description: "Integrate APNs via the backend notification service.",
      priority: "HIGH",
      order: 1,
      columnId: col(mobile, "In Progress").id,
      projectId: mobile.id,
      labels: {
        create: [
          { labelId: lbl(mobile, "mobile").id },
          { labelId: lbl(mobile, "ios").id },
        ],
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
