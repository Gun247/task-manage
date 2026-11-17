/** Jira team-managed inspired roles for FWF Task Manager. */
export type MemberRole = "viewer" | "member" | "administrator";

export const MEMBER_ROLES: MemberRole[] = [
  "viewer",
  "member",
  "administrator",
];

export const ROLE_LABELS: Record<MemberRole, string> = {
  viewer: "Viewer",
  member: "Member",
  administrator: "Administrator",
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  viewer: "ดูงาน คอมเมนต์ และ Watch ได้ แต่สร้าง/แก้ task ไม่ได้",
  member: "สร้าง แก้ เปลี่ยนสถานะ และลิงก์ task ได้",
  administrator: "สิทธิ Member ทั้งหมด + Settings / WIP / จัดการโปรเจกต์ / ลบ task",
};

export function parseMemberRole(value: unknown): MemberRole {
  if (value === "viewer" || value === "member" || value === "administrator") {
    return value;
  }
  return "member";
}

export function canBrowseTasks(_role: MemberRole) {
  return true;
}

export function canComment(role: MemberRole) {
  return Boolean(role);
}

export function canWatch(role: MemberRole) {
  return Boolean(role);
}

export function canCreateOrEditTasks(role: MemberRole) {
  return role === "member" || role === "administrator";
}

export function canTransitionTasks(role: MemberRole) {
  return role === "member" || role === "administrator";
}

export function canDeleteTasks(role: MemberRole) {
  return role === "administrator";
}

export function canManageSettings(role: MemberRole) {
  return role === "administrator";
}

export function canManageProjects(role: MemberRole) {
  return role === "administrator";
}

export const ROLE_PERMISSION_MATRIX: {
  label: string;
  viewer: boolean;
  member: boolean;
  administrator: boolean;
}[] = [
  { label: "ดู task / โปรเจกต์", viewer: true, member: true, administrator: true },
  { label: "Comment / Watch", viewer: true, member: true, administrator: true },
  { label: "สร้าง / แก้ task", viewer: false, member: true, administrator: true },
  { label: "เปลี่ยนสถานะ (Kanban)", viewer: false, member: true, administrator: true },
  { label: "ลิงก์ task", viewer: false, member: true, administrator: true },
  { label: "ลบ task", viewer: false, member: false, administrator: true },
  { label: "Settings / WIP / ธีม", viewer: false, member: false, administrator: true },
  { label: "จัดการโปรเจกต์", viewer: false, member: false, administrator: true },
];
