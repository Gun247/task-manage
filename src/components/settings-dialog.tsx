"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Priority, Status, TeamMember } from "@/lib/types";
import { Trash2 } from "lucide-react";

const COLOR_OPTIONS = [
  "#EF4444",
  "#F97316",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#1E3A5F",
  "#6B7280",
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: Status[];
  teamMembers: TeamMember[];
  priorities: Priority[];
  onChanged: () => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  statuses,
  teamMembers,
  priorities,
  onChanged,
}: SettingsDialogProps) {
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState(COLOR_OPTIONS[3]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberColor, setNewMemberColor] = useState(COLOR_OPTIONS[2]);

  async function addStatus() {
    if (!newStatusName.trim()) return;
    await fetch("/api/statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStatusName.trim(), color: newStatusColor }),
    });
    setNewStatusName("");
    onChanged();
  }

  async function deleteStatus(status: Status) {
    if (statuses.length <= 1) return;

    const fallback = statuses.find((item) => item.id !== status.id);
    if (!fallback) return;

    const response = await fetch(`/api/statuses/${status.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moveToStatusId: fallback.id }),
    });

    if (response.ok) onChanged();
  }

  async function addMember() {
    if (!newMemberName.trim()) return;
    await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: newMemberName.trim(),
        color: newMemberColor,
      }),
    });
    setNewMemberName("");
    onChanged();
  }

  async function deleteMember(member: TeamMember) {
    await fetch(`/api/team-members/${member.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            จัดการสถานะ ทีม และ priority ของโปรเจกต์
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="status">
          <TabsList>
            <TabsTrigger value="status">สถานะ</TabsTrigger>
            <TabsTrigger value="team">ทีม</TabsTrigger>
            <TabsTrigger value="priority">Priority</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <div className="space-y-2">
              {statuses.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {status.name}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteStatus(status)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-4">
              <Label>เพิ่มสถานะใหม่</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  className="min-w-[180px] flex-1"
                  placeholder="ชื่อสถานะ"
                  value={newStatusName}
                  onChange={(event) => setNewStatusName(event.target.value)}
                />
                <div className="flex gap-1">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 ${
                        newStatusColor === color
                          ? "border-slate-900"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewStatusColor(color)}
                    />
                  ))}
                </div>
                <Button type="button" onClick={addStatus}>
                  เพิ่ม
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="space-y-2">
              {teamMembers.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  ยังไม่มีสมาชิกทีม — เพิ่มชื่อเล่นเพื่อ assign task ได้
                </p>
              )}
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {member.nickname}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMember(member)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-slate-300 p-4">
              <Label>เพิ่มสมาชิกทีม</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  className="min-w-[180px] flex-1"
                  placeholder="ชื่อเล่น"
                  value={newMemberName}
                  onChange={(event) => setNewMemberName(event.target.value)}
                />
                <div className="flex gap-1">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 ${
                        newMemberColor === color
                          ? "border-slate-900"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewMemberColor(color)}
                    />
                  ))}
                </div>
                <Button type="button" onClick={addMember}>
                  เพิ่ม
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="priority" className="space-y-2">
            {priorities.map((priority) => (
              <div
                key={priority.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: priority.color }}
                  />
                  <span className="text-sm font-medium text-slate-800">
                    {priority.label}
                  </span>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
