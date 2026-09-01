# FWF Task Manager

ระบบจัดการ Task สำหรับโปรเจกต์ **Foreigner Worker Fund (FWF)** แทนที่ Google Spreadsheet ด้วยเว็บแอปที่รองรับ 3 มุมมอง: รายการ, Kanban (drag & drop), และปฏิทิน

## Figma Design

Wireframes อยู่ในไฟล์ Figma: [FWF Task Manager](https://www.figma.com/design/pszfZz28gfiAgPyCzBRCFH/FWF-Task-Manager)

## Features

- **List View** — ตาราง task แบบ spreadsheet พร้อม filter
- **Kanban View** — ลาก task ข้ามคอลัมน์เพื่อเปลี่ยนสถานะ
- **Calendar View** — ดู task ตามช่วงวันที่ พร้อม panel รายละเอียดรายวัน
- **Settings** — เพิ่ม/ลบ สถานะ (Status) และสมาชิกทีม (Team Member)
- **CRUD Tasks** — สร้าง แก้ไข task พร้อม Priority, Type, วันที่, คำอธิบาย

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn-style UI components
- Prisma 7 + SQLite
- @dnd-kit — Kanban drag & drop
- date-fns — ปฏิทิน

## Getting Started

```bash
# ติดตั้ง dependencies
npm install

# สร้าง database และ seed ข้อมูลเริ่มต้น (Priority + Status)
npx prisma migrate dev
npm run db:seed

# รัน dev server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:43123](http://localhost:43123)

## Database Schema

| Model | ฟิลด์หลัก |
|-------|-----------|
| Task | name, description, remarks, taskType, startDate, endDate, priorityId, statusId, assigneeId |
| Status | name, color, sortOrder |
| TeamMember | nickname, color, sortOrder |
| Priority | label, color, sortOrder |

## API Endpoints

| Method | Path | หน้าที่ |
|--------|------|---------|
| GET/POST | `/api/tasks` | ดึง/สร้าง task |
| PATCH/DELETE | `/api/tasks/[id]` | แก้ไข/ลบ task |
| GET/POST | `/api/statuses` | จัดการสถานะ |
| PATCH/DELETE | `/api/statuses/[id]` | แก้/ลบสถานะ |
| GET/POST | `/api/team-members` | จัดการทีม |
| PATCH/DELETE | `/api/team-members/[id]` | แก้/ลบสมาชิก |
| GET/PATCH | `/api/priorities` | ดู/แก้ priority |

## Seed Data

- **Priority:** P0, P1, P2
- **Status:** Backlog, In Progress, PRD, UAT, Done
- **TeamMember:** ว่าง (เพิ่มผ่าน Settings)
- **Task:** ว่าง (เพิ่มผ่าน + New Task)
