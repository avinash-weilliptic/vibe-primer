import type { Priority } from "@prisma/client";

export type LabelChip = {
  id: string;
  name: string;
  color: string;
};

export type TaskCardData = {
  id: string;
  title: string;
  priority: Priority;
  labels: LabelChip[];
};

export type ColumnData = {
  id: string;
  name: string;
  tasks: TaskCardData[];
};
