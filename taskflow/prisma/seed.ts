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
    data: {
      name: "Acme Corp",
      slug: "acme-corp",
    },
  });

  const websiteRedesign = await prisma.project.create({
    data: {
      name: "Website Redesign",
      description: "Redesign the company website with a modern look and feel",
      workspaceId: workspace.id,
    },
  });

  const mobileApp = await prisma.project.create({
    data: {
      name: "Mobile App",
      description: "Build a cross-platform mobile application",
      workspaceId: workspace.id,
    },
  });

  const columnNames = ["To Do", "In Progress", "Done"];

  const webColumns = await Promise.all(
    columnNames.map((name, i) =>
      prisma.column.create({
        data: { name, order: i, projectId: websiteRedesign.id },
      })
    )
  );

  const appColumns = await Promise.all(
    columnNames.map((name, i) =>
      prisma.column.create({
        data: { name, order: i, projectId: mobileApp.id },
      })
    )
  );

  const webBug = await prisma.label.create({
    data: { name: "Bug", color: "#ef4444", projectId: websiteRedesign.id },
  });
  const webFeature = await prisma.label.create({
    data: { name: "Feature", color: "#3b82f6", projectId: websiteRedesign.id },
  });
  const appDesign = await prisma.label.create({
    data: { name: "Design", color: "#8b5cf6", projectId: mobileApp.id },
  });
  const appFeature = await prisma.label.create({
    data: { name: "Feature", color: "#3b82f6", projectId: mobileApp.id },
  });

  const task1 = await prisma.task.create({
    data: {
      title: "Design new homepage layout",
      description: "Create wireframes and mockups for the new homepage",
      priority: Priority.HIGH,
      order: 0,
      columnId: webColumns[1].id,
      projectId: websiteRedesign.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: "Fix navigation menu on mobile",
      description: "Hamburger menu doesn't close after selecting a link",
      priority: Priority.URGENT,
      order: 0,
      columnId: webColumns[0].id,
      projectId: websiteRedesign.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      title: "Update footer links",
      priority: Priority.LOW,
      order: 0,
      columnId: webColumns[2].id,
      projectId: websiteRedesign.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      title: "Set up authentication flow",
      description: "Implement login, signup, and password reset screens",
      priority: Priority.HIGH,
      order: 0,
      columnId: appColumns[0].id,
      projectId: mobileApp.id,
    },
  });

  const task5 = await prisma.task.create({
    data: {
      title: "Design onboarding screens",
      description: "Create the first-time user onboarding experience",
      priority: Priority.MEDIUM,
      order: 1,
      columnId: appColumns[0].id,
      projectId: mobileApp.id,
    },
  });

  await prisma.taskLabel.createMany({
    data: [
      { taskId: task1.id, labelId: webFeature.id },
      { taskId: task2.id, labelId: webBug.id },
      { taskId: task4.id, labelId: appFeature.id },
      { taskId: task5.id, labelId: appDesign.id },
    ],
  });

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
