import type { MemberRole } from "@/lib/roles";

export type { MemberRole };

export type TaskType = string;

export type ViewMode = "list" | "kanban" | "calendar";

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  theme: string;
  /** status name → WIP limit; 0 or missing = unlimited */
  wipLimits: Record<string, number>;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: { tasks: number };
}

export interface ColorTheme {
  id: string;
  label: string;
  description: string;
  palette: {
    primary: string;
    primaryDark: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
    canvas: string;
    success: string;
    danger: string;
    warning: string;
    slate: Record<string, string>;
  };
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
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

export interface TaskTypeOption {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface TeamMember {
  id: string;
  name: string;
  nickname: string;
  email: string;
  employeeId: string;
  /** Jira-style: viewer | member | administrator */
  role: MemberRole;
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

export interface PostReleaseChangeEntry {
  id: string;
  taskId: string;
  changeType: "status" | "uatDate" | "prdDate" | string;
  fromValue: string;
  toValue: string;
  reason: string;
  afterMilestone: "UAT" | "PRD" | string;
  changedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  authorId: string | null;
  authorNickname: string;
  createdAt: string;
}

export type TaskLinkType = "blocks" | "relates";

export interface TaskLink {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  linkType: TaskLinkType | string;
  otherTask: { id: string; name: string; statusName: string };
  direction: "out" | "in";
  createdAt: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  projectId: string | null;
  filters: TaskFilters & { scope?: "postRelease" | "rework" | "" };
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  teamMemberId: string | null;
  taskId: string | null;
  title: string;
  body: string;
  kind: string;
  readAt: string | null;
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  name: string;
  isDone: boolean;
  sortOrder: number;
  assignees: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  remarks: string;
  /** Origin marker — e.g. "plan-uat" when imported from Google Sheet. Empty = manual. */
  source: string;
  /** @deprecated use taskTypes — kept as first type for compatibility */
  taskType: TaskType;
  taskTypes: TaskType[];
  startDate: string | null;
  endDate: string | null;
  uatDate: string | null;
  prdDate: string | null;
  sortOrder: number;
  projectId: string;
  priorityId: string;
  statusId: string;
  /** @deprecated use assignees — kept as first assignee for compatibility */
  assigneeId: string | null;
  ownerId: string | null;
  project: Project;
  priority: Priority;
  status: Status;
  /** @deprecated use assignees */
  assignee: TeamMember | null;
  assignees: TeamMember[];
  owner: TeamMember | null;
  statusHistory: StatusHistoryEntry[];
  postReleaseChanges: PostReleaseChangeEntry[];
  hasPostReleaseChanges: boolean;
  comments: TaskComment[];
  links: TaskLink[];
  watchers: TeamMember[];
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export type TaskOverdueFilter = "" | "overdue";

export interface TaskFilters {
  search: string;
  statusId: string;
  priorityId: string;
  assigneeId: string;
  taskType: string;
  date: string;
  dateField: TaskDateFilterField;
  /** Empty = all tasks; "overdue" = only past-due incomplete tasks. */
  overdue: TaskOverdueFilter;
}

export type TaskDateFilterField =
  | ""
  | "startDate"
  | "endDate"
  | "uatDate"
  | "prdDate";
