# FWF Task Manager

ระบบจัดการ Task สำหรับโปรเจกต์ **Foreigner Worker Fund (FWF)** แทนที่ Google Spreadsheet ด้วยเว็บแอปที่รองรับ 3 มุมมอง: รายการ, Kanban (drag & drop), และปฏิทิน

**Repository:** https://github.com/Gun247/task-manage

## เอกสารโปรเจกต์

| เอกสาร | เนื้อหา |
|--------|---------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | โครงสร้างระบบ, data model, API, frontend patterns |
| [docs/DESIGN.md](docs/DESIGN.md) | การออกแบบ UI/UX, สี, layout, interaction |
| [Figma — FWF Task Manager](https://www.figma.com/design/pszfZz28gfiAgPyCzBRCFH/FWF-Task-Manager) | Wireframe ต้นฉบับ |

## Features

- **List View** — ตาราง task แบบ spreadsheet พร้อม filter
- **Kanban View** — ลาก task ข้ามคอลัมน์เพื่อเปลี่ยนสถานะ
- **Calendar View** — ดู task ตามช่วงวันที่ พร้อม panel รายละเอียดรายวัน
- **Settings** — เพิ่ม/ลบ สถานะ (Status) และสมาชิกทีม (Team Member)
- **CRUD Tasks** — สร้าง แก้ไข task พร้อม Priority, Type, วันที่, คำอธิบาย

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 + shadcn-style UI |
| Database | Prisma 7 + SQLite (`better-sqlite3` adapter) |
| Drag & Drop | `@dnd-kit` |
| Calendar | `react-big-calendar` + `date-fns` |
| Icons | `lucide-react` |

## Getting Started

```bash
# clone
git clone https://github.com/Gun247/task-manage.git
cd task-manage

# ติดตั้ง dependencies (รัน prisma generate อัตโนมัติ)
npm install

# ตั้งค่า environment
cp .env.example .env

# สร้าง database และ seed ข้อมูลเริ่มต้น (Priority + Status)
npx prisma migrate dev
npm run db:seed

# รัน dev server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:43123](http://localhost:43123)

## โครงสร้างโปรเจกต์ (ย่อ)

```
prisma/           schema, migrations, seed
src/app/
  tasks/          หน้าหลัก (list / kanban / calendar)
  api/            REST endpoints
src/components/   views, dialogs, ui primitives
src/lib/          prisma client, types, utils
docs/             เอกสาร architecture + design
```

## Database Schema

```
Priority ──< Task >── Status
                └──> TeamMember (assignee, optional)
```

| Model | ฟิลด์หลัก |
|-------|-----------|
| Task | name, description, remarks, taskType, startDate, endDate, priorityId, statusId, assigneeId |
| Status | name, color, sortOrder |
| TeamMember | nickname, color, sortOrder, isActive |
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

## สำหรับ Developer / AI Agent

ก่อนแก้ไขโค้ด อ่าน [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) เพื่อเข้าใจ data flow และ conventions

งานที่ยังไม่ทำ (optional):

- Google Sheets import/sync
- Authentication
- Deploy (Vercel / production DB)
- E2E test suite
