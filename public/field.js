export const FIELDS = [
  { key: 'reporterName', label: 'ชื่อ-นามสกุล (ผู้แจ้ง)', type: 'text', max: 100 },
  { key: 'reporterPosition', label: 'ตำแหน่ง (ผู้แจ้ง)', type: 'text', max: 100 },
  { key: 'reporterPhone', label: 'เบอร์โทร (ผู้แจ้ง)', type: 'tel', max: 30 },
  { key: 'victimName', label: 'ชื่อ-นามสกุล (ผู้ประสบเหตุ)', type: 'text', max: 100 },
  { key: 'victimPosition', label: 'ตำแหน่ง (ผู้ประสบเหตุ)', type: 'text', max: 100 },
  { key: 'victimPhone', label: 'เบอร์โทร (ผู้ประสบเหตุ)', type: 'tel', max: 30 },
  { key: 'contractor', label: 'ชื่อบริษัทผู้รับเหมาก่อสร้าง', type: 'text', max: 150 },
  { key: 'project', label: 'โครงการฯ ก่อสร้าง', type: 'text', max: 150 },
  { key: 'location', label: 'สถานที่เกิดเหตุ', type: 'textarea', max: 300 },
  { key: 'occurredAt', label: 'วัน-เวลาที่เกิดเหตุ', type: 'datetime-local', max: 20 },
  { key: 'equipment', label: 'รถ / เครื่องจักร / อุปกรณ์ที่เกิดเหตุ', type: 'text', max: 200 },
  { key: 'description', label: 'ลักษณะการเกิดเหตุเป็นแบบใด', type: 'textarea', max: 600 },
  { key: 'injury', label: 'มีผู้ได้รับบาดเจ็บหรือไม่', type: 'choice', options: ['ไม่มี', 'มี'], detailPlaceholder: 'จำนวน / อาการ (ถ้ามี)', max: 300 },
  { key: 'damage', label: 'มีทรัพย์สินเสียหายหรือไม่', type: 'choice', options: ['ไม่มี', 'มี'], detailPlaceholder: 'ทรัพย์สินที่เสียหาย (ถ้ามี)', max: 300 },
  { key: 'reported', label: 'มีการแจ้งความหรือประกันหรือไม่', type: 'choice', options: ['ยังไม่ได้แจ้ง', 'แจ้งความแล้ว', 'แจ้งประกันแล้ว', 'แจ้งทั้งสองแล้ว'], detailPlaceholder: 'สถานีตำรวจ / เลขเคลม (ถ้ามี)', max: 300 },
  { key: 'currentStatus', label: 'สถานะปัจจุบันเป็นอย่างไร', type: 'textarea', max: 400 },
  { key: 'expenses', label: 'ค่าใช้จ่าย / ใบเสร็จ', type: 'textarea', max: 300 },
];

export const MAX_IMAGES = 10;