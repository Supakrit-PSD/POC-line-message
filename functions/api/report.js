// POST /api/report — รับฟอร์มจากหน้า LIFF ตรวจตัวตน + ตรวจข้อมูล แล้ว push เข้ากลุ่ม
import { verifyLiffUser, pushMessages } from "../../lib/line";
import { FIELDS } from "../../public/field.js";

export async function onRequestPost({ request, env }) {
    try{
        const body = await request.json();

        // 1. ตรวจตัวตนก่อนเสมอ — ล้มเร็วก่อนเปลืองแรงไป validate 17 ช่อง
        const profile = await verifyLiffUser(env, body.accessToken);

        // 2. ไม่เชื่อ validation ฝั่ง browser ตรวจซ้ำเองทั้งหมด
        const fields = validateFields(body.fields);

        // 3. ประกอบข้อความ
        const text = buildText(fields, profile?.displayName);

        // 4. ส่งเข้ากลุ่ม
        if (!env.LINE_GROUP_ID) throw new Error('server ยังไม่ได้ตั้ง LINE_GROUP_ID');
        await pushMessages(env, env.LINE_GROUP_ID, [{ type: 'text', text }]);

        // log ไว้ตามรอยได้ว่าใครส่งอะไร — ห้าม log accessToken
        console.log(JSON.stringify({
            type: 'report',
            receivedAt: new Date().toISOString(),
            lineUserId: profile?.userId,
            displayName: profile?.displayName,
            fields,
        }));

        return Response.json({ ok: true });
    }catch(err){
        console.error('[report]', err.message);
        return Response.json({ ok: false, error: err.message }, { status: 400 });
    }
}

function validateFields(input) {
    if (!input || typeof input !== 'object') throw new Error('ไม่พบข้อมูลฟอร์ม');

    const out = {};
    for (const f of FIELDS) {
        const v = typeof input[f.key] === 'string' ? input[f.key].trim() : '';
        if (!v) throw new Error(`กรุณากรอก: ${f.label}`);
        out[f.key] = v.slice(0, f.max);
    }
    return out;
}

// 2026-11-02T14:30 → 02/11/2026 14:30 น.
function formatValue(f, value) {
    if (f.type === 'datetime-local') {
        const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
        if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]} น.`;
    }
    return value;
}

// วนจาก FIELDS ไม่ใช่จาก Object.keys(fields) ลำดับข้อจะได้ตรงกับฟอร์มเสมอ
function buildText(fields, sender) {
    const lines = ['🚨 แจ้งเหตุ', ''];
    FIELDS.forEach((f, i) => lines.push(`${i + 1}. ${f.label}: ${formatValue(f, fields[f.key])}`));
    if (sender) lines.push('', `ส่งผ่าน LIFF โดย: ${sender}`);
    return lines.join('\n').slice(0, 5000);   // text message ของ LINE ยาวได้ 5000
}
