// GET /api/config — ค่า config ที่หน้าเว็บต้องใช้ (ไม่มีอะไรลับ)
// แยกออกมาเป็น endpoint แทนการ hardcode ใน HTML เพื่อให้เปลี่ยน LIFF ID ได้โดยไม่ต้องแก้โค้ดหน้าเว็บ
export function onRequestGet({ env }) {
    return Response.json({ liffId: env.LIFF_ID || '' });
}
