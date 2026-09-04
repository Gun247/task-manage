# FWF Task Manager — Design Document

เอกสารการออกแบบ UI/UX อ้างอิงจาก wireframe ใน Figma และการ implement จริง

## Design Source

| รายการ | ลิงก์ |
|--------|-------|
| Figma file | [FWF Task Manager](https://www.figma.com/design/pszfZz28gfiAgPyCzBRCFH/FWF-Task-Manager) |
| Screens | List, Kanban, Calendar, Settings modal, Mobile shell |

Wireframe ถูกสร้างก่อนเขียนโค้ด (design-first workflow) เพื่อกำหนด layout, navigation และ empty states

## Design Goals

1. **แทน Google Spreadsheet** — ผู้ใช้คุ้นเคยกับตาราง task tracker เดิม
2. **3 มุมมองเดียวกัน** — ข้อมูลชุดเดียว แสดงต่างรูปแบบ (list / board / calendar)
3. **Dynamic metadata** — Status และ Team Member เพิ่ม/ลบได้โดยไม่แก้โค้ด
4. **เริ่มจาก empty** — ไม่ import ข้อมูลเก่า; seed เฉพาะ priority + status มาตรฐาน

## Visual Language

### Color Palette

| Token | Hex | ใช้กับ |
|-------|-----|--------|
| Primary / Brand | `#1E3A5F` | header title, active tab, kanban drop highlight |
| Background | `#F8FAFC` | page background (`--background`) |
| Foreground | `#0F172A` | body text |
| Surface | `#FFFFFF` | cards, columns, dialogs |
| Border | `slate-200` | tables, columns, inputs |

### Status Colors (seed)

| Status | Color |
|--------|-------|
| Backlog | `#6B7280` |
| In Progress | `#3B82F6` |
| Done | `#1E3A5F` |
| UAT | `#F97316` |
| PRD | `#22C55E` |

### Priority Colors (seed)

| Priority | Color |
|----------|-------|
| P0 | `#EF4444` |
| P1 | `#F97316` |
| P2 | `#6B7280` |

Settings dialog มี color picker 8 สีมาตรฐานสำหรับ status/team ใหม่

### Typography

- **Inter** — Latin text
- **Noto Sans Thai** — ภาษาไทย
- โหลดผ่าน `next/font/google` ใน `layout.tsx`
- ขนาดหลัก: `text-sm` สำหรับ UI, `text-xl font-bold` สำหรับหัวข้อแอป

## Screen Structure

### App Shell (ทุก view)

```
┌──────────────────────────────────────────────────────────┐
│ FWF Task Manager                    [รายการ|Kanban|ปฏิทิน] │
│ Foreigner Worker Fund               [Settings] [New Task]  │
├──────────────────────────────────────────────────────────┤
│ [ค้นหา...] [Priority▼] [Assignee▼] [Type▼]               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    << View Content >>                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- View switcher: segmented control พื้นหลัง `slate-100`
- Filter bar: แสดงทุก view (filter client-side)
- Responsive: header stack แนวตั้งบน mobile (`lg:flex-row`)

### List View

- ตารางคล้าย spreadsheet
- คอลัมน์: ชื่อ, Priority, Status, Type, Assignee, วันที่
- คลิกแถว → เปิด Task Form Dialog
- Empty state: ข้อความชวนสร้าง task แรก + ปุ่ม

### Kanban View

- คอลัมน์ตาม Status (`sortOrder`)
- ความกว้างคอลัมน์ ~280px, scroll แนวนอน
- Task card: priority badge, ชื่อ, assignee dot, วันที่
- Drag card ข้ามคอลัมน์ → เปลี่ยน status ทันที
- ปุ่ม `+` ในแต่ละคอลัมน์ → สร้าง task พร้อม preset status

### Calendar View

- ปฏิทินรายเดือน (`react-big-calendar`)
- Task แสดงตาม `startDate`–`endDate`
- คลิกวัน → panel รายการ task ในวันนั้น
- Task ไม่มีวันที่ → ไม่แสดงในปฏิทิน

### Settings Modal

แบ่ง 3 แท็บ:

1. **Statuses** — เพิ่ม/ลบ status (ลบต้อง reassign task)
2. **Team** — เพิ่ม/ลบสมาชิก (nickname + สี)
3. **Priorities** — แก้สี priority (label คงที่จาก seed)

### Task Form Dialog

ฟิลด์:

| Field | Type | Required |
|-------|------|----------|
| name | text | ใช่ |
| description | textarea | ไม่ |
| remarks | textarea | ไม่ |
| taskType | select: Back End / Front End | default Back End |
| priority | select | default P0 |
| status | select | default Backlog |
| assignee | select (nullable) | ไม่ |
| startDate / endDate | date | ไม่ |

## Interaction Patterns

| Action | Pattern |
|--------|---------|
| สร้าง task | Modal dialog |
| แก้ task | คลิก card/row → modal เดิม |
| เปลี่ยน status (Kanban) | Drag & drop, optimistic UI |
| กรองข้อมูล | Client-side filter, ไม่ reload API |
| โหลดข้อมูล | Full reload หลัง save settings/form |

## Empty & Loading States

- **Loading:** card กลางจอ ข้อความ "กำลังโหลด..."
- **Empty list:** illustration + CTA "New Task"
- **Empty kanban column:** พื้นที่ว่างในคอลัมน์ (ไม่มี placeholder พิเศษ)
- **Empty calendar day:** panel ว่างเมื่อไม่มี task

## Mobile Considerations

Figma มี mobile shell wireframe; implementation ปัจจุบัน:

- Header และ filter wrap ได้
- Kanban scroll แนวนอน
- ตาราง list อาจ scroll แนวนอนบนจอเล็ก
- ยังไม่มี bottom navigation แยก (ใช้ header เดียวกับ desktop)

## Mapping จาก Spreadsheet เดิม

อ้างอิงโครงสร้าง Google Spreadsheet task tracker ของ FWF:

| Spreadsheet concept | App equivalent |
|--------------------|----------------|
| แถว task | `Task` model |
| คอลัมน์ Status | `Status` model + Kanban columns |
| Priority (P0/P1/P2) | `Priority` model |
| ผู้รับผิดชอบ | `TeamMember.nickname` |
| Type (BE/FE) | `Task.taskType` |
| วันที่เริ่ม–สิ้นสุด | `startDate`, `endDate` |
| หมายเหตุ | `remarks` |

**ยังไม่ implement:** sync กับ Google Sheets, formula, comment thread

## Screenshots (Design Phase)

Wireframe screenshots จาก design phase เก็บไว้ใน session artifacts ของ Cloud Agent (`/opt/cursor/artifacts/design/`) — ไม่ได้ commit ใน repo
