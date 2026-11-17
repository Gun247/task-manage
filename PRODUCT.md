# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

สมาชิกทีมที่ Administrator เพิ่มลงในโปรเจกต์และระบุเลขพนักงานแล้ว — ทุกคนในรายชื่อนั้นเข้าใช้งานได้ตาม Role (Viewer / Member / Administrator)

## Product Purpose

TIM TaskManage แทน Google Spreadsheet สำหรับติดตามงานโปรเจกต์ Foreigner Worker Fund ด้วยมุมมอง List / Kanban / Calendar จากข้อมูลชุดเดียว และควบคุมสิทธิ์ด้วย Role แบบ Jira

## Positioning

Task tracker ของทีม FWF ที่ผูกตัวตนด้วยเลขพนักงาน + Role ในโปรเจกต์ ไม่ใช่ self-serve SaaS หรือ public signup

## Operating Context

ใช้ในงานประจำวันของทีม: สร้าง/ย้าย task, กรอง, ดู timeline/ประวัติ, ตั้งค่า status/team (admin), เข้าสู่ระบบด้วยเลขพนักงาน

## Capabilities and Constraints

- มุมมอง: List, Kanban (drag & drop), Calendar
- หลายโปรเจกต์; Settings สำหรับ Status / Team / Priority / WIP
- Login ด้วยเลขพนักงานเท่านั้น; Admin เพิ่มรหัสพนักงานใน Settings → ทีม
- Role: Viewer (ดู/comment/watch), Member (สร้าง·แก้·เปลี่ยนสถานะ), Administrator (+ settings / จัดการโปรเจกต์ / ลบ)
- หน้าแนะนำผลิตภัณฑ์แยกจากหน้าฟอร์ม login
- ไม่มี public registration; ไม่ sync Google Sheets ในตอนนี้

## Brand Commitments

- ชื่อผลิตภัณฑ์: **TIM TaskManage**
- การอ่าน: **TIM** อ่านเป็นไทยว่า **「ทีม」** (team) — เป็นการเล่นคำ ไม่ใช่ตัวย่อที่ต้องสะกดทีละตัวอักษร
- ความหมายภายใน (มุก / ไม่แสดงบน UI): TIM ≈ “Team is only me”
- ชื่อแบรนด์บนจอและแท็บเบราว์เซอร์คือ TIM TaskManage เท่านั้น — ไม่แสดง “Foreigner Worker Fund” บน UI
- Visual world ปัจจุบัน: ธีม sky–grass ตาม docs/DESIGN.md (primary `#6BB82A`, sky background `#E8F4FC`)

## Evidence on Hand

- README feature list, docs/DESIGN.md, docs/ARCHITECTURE.md
- Figma wireframe: https://www.figma.com/design/pszfZz28gfiAgPyCzBRCFH/FWF-Task-Manager
- ไม่มี testimonials / ลูกค้าภายนอก / benchmark — ห้ามแต่งขึ้น

## Product Principles

1. เข้าใช้งานได้เฉพาะคนที่ Admin ใส่เลขพนักงานแล้ว
2. ข้อมูลชุดเดียว หลายมุมมอง — ไม่แยก silo ตาม view
3. สิทธิ์ชัดเจนตาม Role แบบทีมคุ้นจาก Jira
4. แนะนำผลิตภัณฑ์และ login เป็นสองพื้นผิวแยก — ไม่ปนฟอร์มกับ marketing ในหน้าเดียว
