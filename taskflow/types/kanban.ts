import type { Prisma } from "@prisma/client";

export type ProjectWithBoard = Prisma.ProjectGetPayload<{
  include: {
    columns: {
      include: {
        tasks: {
          include: {
            labels: { include: { label: true } };
          };
        };
      };
    };
  };
}>;

export type KanbanColumn = ProjectWithBoard["columns"][number];
export type KanbanTask = KanbanColumn["tasks"][number];
