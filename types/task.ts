export type TaskType = "daily_prompt" | "content" | "document";

export type Task = {
  id: string;
  type: TaskType;
  title: string;
  pointValue: number;
  completedAt: number | null;
};
