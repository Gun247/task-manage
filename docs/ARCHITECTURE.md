# FWF Task Manager — Architecture

เอกสารนี้อธิบายโครงสร้างทางเทคนิคของโปรเจกต์ เพื่อให้ developer และ AI agent ใน IDE เข้าใจระบบก่อนแก้ไขหรือขยายฟีเจอร์

## ภาพรวมระบบ

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│  src/app/tasks/page.tsx  — state hub, filters, view switch  │
│    ├── TaskListView      — ตาราง spreadsheet-style         │
│    ├── TaskKanbanView    — drag & drop เปลี่ยน status       │
│    └── TaskCalendarView  — ปฏิทิน + panel รายวัน            │
│  TaskFormDialog / SettingsDialog — modal CRUD               │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch("/api/...")
┌──────────────────────────▼──────────────────────────────────┐
│              Next.js Route Handlers (API)                   │
│  /api/tasks, /api/statuses, /api/team-members, /api/priorities │
└──────────────────────────┬──────────────────────────────────┘
                           │ Prisma Client
┌──────────────────────────▼──────────────────────────────────┐
│  SQLite (dev.db)  via  @prisma/adapter-better-sqlite3       │
│  Models: Task, Status, TeamMember, Priority                 │
└─────────────────────────────────────────────────────────────┘
```

แอปเป็น **monolith แบบ full-stack Next.js** — ไม่มี service แยก, ไม่มี auth, ไม่มี sync กับ Google Sheets (ตั้งใจเริ่มจาก empty data)

## โฟลเดอร์และความรับผิดชอบ

```
/workspace
├── prisma/
│   ├── schema.prisma          # data model
│   ├── seed.ts                # seed Priority + Status เท่านั้น
│   └── migrations/            # SQLite migration history
├── src/
│   ├── app/
│   │   ├── layout.tsx         # fonts (Inter + Noto Sans Thai), metadata
│   │   ├── page.tsx           # redirect → /tasks
│   │   ├── globals.css        # Tailwind 4 + design tokens
│   │   ├── tasks/page.tsx     # หน้าหลัก — client component, โหลดข้อมูลทั้งหมด
│   │   └── api/               # REST-style route handlers
│   ├── components/
│   │   ├── task-*.tsx         # view + dialog components
│   │   └── ui/                # shadcn-style primitives (Button, Dialog, …)
│   ├── lib/
│   │   ├── prisma.ts          # singleton Prisma client + SQLite adapter
│   │   ├── types.ts           # shared TypeScript interfaces
│   │   └── utils.ts           # cn(), formatDate()
│   └── generated/prisma/      # auto-generated (gitignored, สร้างจาก postinstall)
├── docs/                      # เอกสารโปรเจกต์
├── prisma7.config.ts          # Prisma 7 config (datasource URL จาก env)
└── next.config.ts             # allowedDevOrigins สำหรับ cloud preview
```

## Data Model

### Entity Relationship

```
Priority ──< Task >── Status
                │
                └──> TeamMember (optional assignee)
```

| Model | คำอธิบาย | หมายเหตุ |
|-------|----------|----------|
| **Task** | งานหลัก | `taskType` เป็น string enum: `Back End` \| `Front End` |
| **Status** | คอลัมน์ workflow | ลบได้ถ้า reassign task ไป status อื่น |
| **TeamMember** | ผู้รับผิดชอบ | soft-delete ผ่าน `isActive`; ลบจริงจะ unset assignee |
| **Priority** | P0/P1/P2 | seed ตายตัว; แก้สีได้ผ่าน API |

### Seed Policy

`prisma/seed.ts` สร้างเฉพาะ:

- Priority: P0 (#EF4444), P1 (#F97316), P2 (#6B7280)
- Status: Backlog → In Progress → Done → UAT → PRD

**ไม่ seed** TeamMember หรือ Task — user เพิ่มผ่าน UI

## API Layer

ทุก endpoint อยู่ใน `src/app/api/` ใช้ `NextResponse.json()` และ Prisma จาก `@/lib/prisma`

### Tasks

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/tasks` | list พร้อม `priority`, `status`, `assignee` |
| POST | `/api/tasks` | สร้าง task; default status/priority ตัวแรกใน DB |
| PATCH | `/api/tasks/[id]` | partial update ทุกฟิลด์ |
| DELETE | `/api/tasks/[id]` | ลบถาวร |

### Statuses

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/statuses` | เรียง `sortOrder` |
| POST | `/api/statuses` | `sortOrder` = max + 1 |
| PATCH | `/api/statuses/[id]` | แก้ name/color/order |
| DELETE | `/api/statuses/[id]` | ต้องส่ง `moveToStatusId` ถ้ามี task ค้าง |

### Team Members

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/team-members` | เฉพาะ `isActive: true` |
| POST | `/api/team-members` | nickname + color |
| PATCH | `/api/team-members/[id]` | แก้ nickname/color/active |
| DELETE | `/api/team-members/[id]` | unset assignee แล้วลบ member |

### Priorities

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/priorities` | list ทั้งหมด |
| PATCH | `/api/priorities` | แก้ label/color (ต้องส่ง `id`) |

## Frontend Architecture

### State Management

ไม่ใช้ Redux/Zustand — `tasks/page.tsx` เป็น **single source of truth**:

1. `loadData()` fetch 4 endpoints พร้อมกัน
2. `filteredTasks` คำนวณ client-side จาก `TaskFilters`
3. Kanban optimistic update: เปลี่ยน UI ก่อน แล้ว PATCH API

### View Components

| Component | ไฟล์ | หน้าที่ |
|-----------|------|---------|
| List | `task-list-view.tsx` | ตาราง responsive, empty state |
| Kanban | `task-kanban-view.tsx` | `@dnd-kit/core` — column = droppable, card = draggable |
| Calendar | `task-calendar-view.tsx` | `react-big-calendar` + date-fns, panel รายละเอียดวัน |
| Card | `task-card.tsx` | แสดง priority badge, assignee, วันที่ |
| Form | `task-form-dialog.tsx` | create/edit task |
| Settings | `settings-dialog.tsx` | tabs: Statuses / Team / Priorities |

### Kanban Drag Flow

```
User drops card on column
  → onDragEnd ใน TaskKanbanView
  → onStatusChange(taskId, statusId) ใน page.tsx
  → optimistic setTasks()
  → PATCH /api/tasks/[id] { statusId }
```

ใช้ `PointerSensor` + `activationConstraint: { distance: 8 }` ป้องกัน drag โดยไม่ตั้งใจ

## Prisma 7 + SQLite

Prisma 7 ต้องใช้ **driver adapter** ไม่ใช่ connection string ตรงๆ:

```typescript
// src/lib/prisma.ts
const adapter = new PrismaBetterSqlite3({ url: resolveDatabasePath(databaseUrl) });
const prisma = new PrismaClient({ adapter });
```

- `DATABASE_URL` default: `file:./dev.db`
- path resolve เป็น absolute จาก `process.cwd()`
- client generate ไปที่ `src/generated/prisma` (gitignored)
- `npm install` รัน `postinstall: prisma generate` อัตโนมัติ

## การรันและ Build

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev    # port 43123
```

| Script | คำสั่ง |
|--------|--------|
| dev | `next dev -p 43123` |
| build | `next build` |
| start | `next start -p 43123` |
| db:seed | `tsx prisma/seed.ts` |

## ข้อจำกัดและทิศทางขยาย

| หัวข้อ | สถานะปัจจุบัน | แนวทางขยาย |
|--------|---------------|------------|
| Authentication | ไม่มี | NextAuth / middleware |
| Google Sheets sync | ไม่มี | import job + mapping columns |
| Real-time | ไม่มี | polling หรือ WebSocket |
| Tests | ไม่มี suite | Playwright E2E ใน devDeps |
| Deploy | local only | Vercel + Turso/Postgres ถ้าเปลี่ยน DB |

## Convention สำหรับการแก้ไข

- UI text ภาษาไทย, code/identifier ภาษาอังกฤษ
- สี primary brand: `#1E3A5F`, background: `#F8FAFC`
- Component ใหม่ที่ reuse ได้ → `src/components/ui/`
- API ใหม่ → `src/app/api/<resource>/route.ts`
- เปลี่ยน schema → `npx prisma migrate dev` + อัปเดต `seed.ts` ถ้าจำเป็น
- อย่า commit `dev.db`, `.env`, `node_modules`, `src/generated/prisma`
