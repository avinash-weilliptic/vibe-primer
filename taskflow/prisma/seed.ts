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

  const websiteRedesign = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Refresh the marketing site and design system.",
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
          { name: "Frontend", color: "#3b82f6" },
          { name: "Bug", color: "#ef4444" },
          { name: "Design", color: "#a855f7" },
        ],
      },
    },
    include: { columns: true, labels: true },
  });

  const mobileApp = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "Native iOS and Android apps for end users.",
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
          { name: "iOS", color: "#0ea5e9" },
          { name: "Android", color: "#22c55e" },
        ],
      },
    },
    include: { columns: true, labels: true },
  });

  const wrCol = Object.fromEntries(
    websiteRedesign.columns.map((c) => [c.name, c]),
  );
  const wrLabel = Object.fromEntries(
    websiteRedesign.labels.map((l) => [l.name, l]),
  );
  const maCol = Object.fromEntries(mobileApp.columns.map((c) => [c.name, c]));
  const maLabel = Object.fromEntries(mobileApp.labels.map((l) => [l.name, l]));

  await prisma.task.create({
    data: {
      title: "Audit existing landing pages",
      description: "Catalog every page and identify removal candidates.",
      priority: "HIGH",
      order: 0,
      columnId: wrCol["To Do"].id,
      projectId: websiteRedesign.id,
      labels: { create: [{ labelId: wrLabel["Frontend"].id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Build new pricing component",
      description: "Replace the legacy table with a cleaner design.",
      priority: "MEDIUM",
      order: 0,
      columnId: wrCol["In Progress"].id,
      projectId: websiteRedesign.id,
      labels: {
        create: [
          { labelId: wrLabel["Frontend"].id },
          { labelId: wrLabel["Design"].id },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      title: "Fix mobile nav overflow",
      description: "Hamburger nav clips on small viewports.",
      priority: "URGENT",
      order: 0,
      columnId: wrCol["Done"].id,
      projectId: websiteRedesign.id,
      labels: { create: [{ labelId: wrLabel["Bug"].id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Set up push notifications (iOS)",
      description: "Wire APNs and confirm payload routing.",
      priority: "HIGH",
      order: 0,
      columnId: maCol["To Do"].id,
      projectId: mobileApp.id,
      labels: { create: [{ labelId: maLabel["iOS"].id }] },
    },
  });

  await prisma.task.create({
    data: {
      title: "Onboarding screen polish (Android)",
      description: "Tighten copy and replace placeholder illustrations.",
      priority: "LOW",
      order: 0,
      columnId: maCol["In Progress"].id,
      projectId: mobileApp.id,
      labels: { create: [{ labelId: maLabel["Android"].id }] },
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
