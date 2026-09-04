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
- **Projects** — จัดการหลายโปรเจกต์ แยก task ตามงาน
- **Inline Create** — สร้าง task ในหน้าโดยตรง (แบบ Jira)
- **Settings** — เพิ่ม/ลบ สถานะ (Status) และสมาชิกทีม (Team Member)
- **CRUD Tasks** — สร้าง แก้ไข task พร้อม Priority, Type, วันที่, คำอธิบาย

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 + shadcn-style UI |
| Database | Prisma 7 + SQLite, Excel (`xlsx`), หรือ Google Sheets |
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
cp .env.example .env.local

# รัน dev server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:43123](http://localhost:43123)

### ใช้ SQLite (ค่าเริ่มต้น)

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

### ใช้ไฟล์ Excel บนเครื่อง

ตั้งค่าใน `.env.local`:

```env
DATABASE_MODE=excel
EXCEL_FILE_PATH=./data/taskDB.xlsx
```

```bash
npm run excel:init
npm run dev
```

### ใช้ Google Sheets

ตั้งค่าใน `.env.local`:

```env
DATABASE_MODE=sheets
GOOGLE_SHEETS_ID=your-spreadsheet-id
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

ขั้นตอน Deploy Apps Script (ทำครั้งเดียว):

1. เปิด Google Spreadsheet ของคุณ
2. **Extensions → Apps Script** → วางโค้ดจาก `google-apps-script/Code.gs`
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. คัดลอก Web App URL ใส่ `GOOGLE_APPS_SCRIPT_URL`
5. รันคำสั่ง:

```bash
npm run sheets:init
npm run sheets:check
npm run dev
```

ตรวจสอบสถานะได้ที่ `GET /api/db-status`

> ถ้าไม่ตั้ง `DATABASE_MODE` แอปจะ fallback ไปใช้ SQLite (`dev.db`) อัตโนมัติ

## โครงสร้างโปรเจกต์ (ย่อ)

```
prisma/           schema, migrations, seed
src/app/
  projects/       หน้าโปรเจกต์ทั้งหมด + จัดการ
  tasks/          หน้าหลัก (list / kanban / calendar)
  api/            REST endpoints
src/components/   views, dialogs, ui primitives
src/lib/          db layer, types, utils
docs/             เอกสาร architecture + design
```

## Database Schema

```
Project ──< Task >── Status
              ├──> Priority
              └──> TeamMember (assignee, optional)
```

| Model | ฟิลด์หลัก |
|-------|-----------|
| Project | name, description, color, sortOrder |
| Task | name, description, remarks, taskType, startDate, endDate, projectId, priorityId, statusId, assigneeId |
| Status | name, color, sortOrder |
| TeamMember | nickname, color, sortOrder, isActive |
| Priority | label, color, sortOrder |

## API Endpoints

| Method | Path | หน้าที่ |
|--------|------|---------|
| GET/POST | `/api/projects` | ดึง/สร้างโปรเจกต์ |
| PATCH/DELETE | `/api/projects/[id]` | แก้/ลบโปรเจกต์ |
| GET/POST | `/api/tasks` | ดึง/สร้าง task |
| PATCH/DELETE | `/api/tasks/[id]` | แก้ไข/ลบ task |
| GET/POST | `/api/statuses` | จัดการสถานะ |
| PATCH/DELETE | `/api/statuses/[id]` | แก้/ลบสถานะ |
| GET/POST | `/api/team-members` | จัดการทีม |
| PATCH/DELETE | `/api/team-members/[id]` | แก้/ลบสมาชิก |
| GET/PATCH | `/api/priorities` | ดู/แก้ priority |
| GET | `/api/db-status` | ตรวจสอบ backend ที่ใช้งาน |

## Seed Data

- **Project:** FWF Task Manager
- **Priority:** P0, P1, P2
- **Status:** Backlog, In Progress, Done, UAT, PRD
- **TeamMember:** ว่าง (เพิ่มผ่าน Settings)
- **Task:** ว่าง (เพิ่มผ่าน + New Task)

## สำหรับ Developer / AI Agent

ก่อนแก้ไขโค้ด อ่าน [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) เพื่อเข้าใจ data flow และ conventions

งานที่ยังไม่ทำ (optional):

- Authentication
- Deploy (Vercel / production DB)
- E2E test suite
