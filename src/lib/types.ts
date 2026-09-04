export type TaskType = "Back End" | "Front End";

export type ViewMode = "list" | "kanban" | "calendar";

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: { tasks: number };
}

export interface Priority {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
}

export interface Status {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface TeamMember {
  id: string;
  nickname: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

export interface StatusHistoryEntry {
  id: string;
  taskId: string;
  fromStatusId: string | null;
  fromStatusName: string;
  toStatusId: string;
  toStatusName: string;
  changedAt: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  remarks: string;
  taskType: TaskType;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  projectId: string;
  priorityId: string;
  statusId: string;
  assigneeId: string | null;
  project: Project;
  priority: Priority;
  status: Status;
  assignee: TeamMember | null;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  search: string;
  priorityId: string;
  assigneeId: string;
  taskType: string;
}
