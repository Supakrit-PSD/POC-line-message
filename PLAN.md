# แผนงาน: LIFF + Form + Push เข้ากลุ่ม

ต่อจาก LEARN.md ขั้น 1–6 (webhook / reply / push ทำงานแล้ว)
เป้าหมายปลายทาง: **ผู้ใช้เปิด LIFF → ล็อกอิน LINE → กรอกฟอร์ม → ระบบ push เข้ากลุ่ม พร้อมชื่อผู้ส่ง**

---

## ข้อจำกัดที่ต้องรู้ก่อนวางลำดับงาน

**LIFF endpoint ต้องเป็น HTTPS** — `wrangler pages dev` ให้ `http://localhost:8788` ซึ่ง LIFF ใช้ไม่ได้

แปลว่าตั้งแต่ Phase 2 เป็นต้นไป วงจรการทำงานจะเปลี่ยนเป็น:
```
แก้โค้ด → npm run deploy → เปิดใน LINE บนมือถือ → npm run logs ดู error
```
ช้ากว่าเดิมมาก จึงต้องออกแบบให้ **ทดสอบส่วนใหญ่ได้บน localhost** แล้วค่อยขึ้นไปเทสต์เฉพาะส่วนที่ต้องใช้ LINE จริง
→ นี่คือเหตุผลที่ Phase 2 ต้องมี "โหมดทดสอบ" (ไม่มี LIFF_ID = ไม่ต้องล็อกอิน)

---

## Phase 0 — เก็บหนี้ก่อน (ต้องทำก่อนทุกอย่าง)

บั๊ก 2 จุดที่ทำให้ reply ไม่ทำงานจริง แม้ log จะดูปกติ — ดูรายละเอียดในแชท

- [ ] `lib/line.js` — `body` ของ `replyMessages` อยู่ผิดที่
- [ ] `functions/webhook.js` — `replyToken` อยู่บน event ไม่ใช่บน `message`
- [ ] `functions/webhook.js` — เช็ค `ev.message.type === 'text'` ด้วย
- [ ] `functions/webhook.js` — `env.LINE_CHANNEL_SECRET` อาจ undefined แล้ว `.trim()` จะพัง
- [ ] เปลี่ยนชื่อ `veritySignature` → `verifySignature`, `pushMesseage` → `pushMessages`

**ทดสอบว่าหายจริง:** ทักบอท ต้องได้ข้อความกลับ และ `npm run logs` ต้องไม่มี `[webhook] reply error`

---

## Phase 1 — สร้าง LINE Login channel + LIFF (งานในคอนโซล ไม่แตะโค้ด)

- [ ] สร้าง **LINE Login channel** ใน **provider เดียวกัน** กับ Messaging API channel
- [ ] เพิ่ม LIFF app: size `Full`, Endpoint URL = URL ของ Pages, scope `profile` + `openid`
- [ ] เก็บ 2 ค่า: `LIFF_ID` (จากแท็บ LIFF) และ `LINE_LOGIN_CHANNEL_ID` (จาก Basic settings)
- [ ] ใส่ทั้งคู่ใน `wrangler.toml` ใต้ `[vars]` — **ไม่ใช่ secret** เพราะต้องส่งให้ browser อยู่แล้ว
- [ ] เขียน `functions/api/config.js` → `GET /api/config` คืน `{ liffId }`

**ประเด็นที่ต้องเข้าใจ:** ทำไม LIFF ID ไม่ใช่ความลับ แต่ Channel access token เป็น?
(คำใบ้: LIFF ID แค่ระบุว่า "หน้านี้คือแอปไหน" ใครรู้ก็ทำอะไรไม่ได้ ส่วน token คือกุญแจส่งข้อความ)

**ทำไมต้องอยู่ provider เดียวกัน:** LIFF จะผูกกับบอทตัวไหน ดูจาก provider

---

## Phase 2 — หน้า LIFF ที่ล็อกอินได้

เขียนใน `public/index.html` (ไฟล์เดียวจบ ไม่ต้องมี build step)

```html
<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
```

```js
// TODO: fetch('/api/config') → ได้ liffId
// TODO: ถ้าไม่มี liffId → โหมดทดสอบ: ข้ามทั้งหมด แสดงป้าย "โหมดทดสอบ"
// TODO: await liff.init({ liffId })
// TODO: ถ้า !liff.isLoggedIn() → liff.login()
// TODO: const profile = await liff.getProfile()   → displayName, userId, pictureUrl
// TODO: const accessToken = liff.getAccessToken()  → เก็บไว้ส่งไปกับฟอร์ม
```

**เช็คพอยต์:** เปิดใน LINE แล้วเห็นชื่อตัวเอง / เปิดใน Chrome ธรรมดาแล้วขึ้นโหมดทดสอบ

**กับดัก**
- `liff.init()` เป็น async และต้องรอให้เสร็จก่อนเรียก method อื่นทุกตัว
- `liff.login()` จะ redirect ออกจากหน้า → โค้ดหลังบรรทัดนั้นไม่ทำงาน
- ปุ่มปิดหน้าต้องใช้ `liff.closeWindow()` ซึ่งใช้ได้เฉพาะใน LINE → ต้องมี fallback

---

## Phase 3 — ตรวจตัวตนผู้ใช้ฝั่ง server

**หลักการที่สำคัญที่สุดของ phase นี้:** ห้ามเชื่อ `userId` / `displayName` ที่ browser ส่งมา
ใครก็ปลอมได้ด้วย curl บรรทัดเดียว → ต้องส่ง **access token** มาแล้วให้ server ไปถาม LINE เอง

เพิ่มใน `lib/line.js`:
```js
export async function verifyLiffUser(env, accessToken) {
  // TODO: ถ้าไม่ได้ตั้ง LINE_LOGIN_CHANNEL_ID → return null (โหมดทดสอบ)
  // TODO: GET /oauth2/v2.1/verify?access_token=...
  //       ต้องเช็ค 2 อย่าง: info.client_id === LINE_LOGIN_CHANNEL_ID  และ  info.expires_in > 0
  // TODO: GET /v2/profile ด้วย Authorization: Bearer <accessToken> → คืน profile
}
```

**ทำไมต้องเช็ค `client_id`:** token ที่ valid แต่มาจากแอปอื่นก็ยัง valid — ถ้าไม่เช็ค ใครที่มี LIFF ของตัวเองก็ยิงเข้าระบบเราได้

**หนี้ที่ตั้งใจก่อ:** การ `return null` เมื่อไม่มี `LINE_LOGIN_CHANNEL_ID` คือประตูที่เปิดทิ้งไว้แบบเดียวกับ `LINE_CHANNEL_SECRET` — จดไว้ใน Phase 8

---

## Phase 4 — นิยามฟอร์มเป็น "ข้อมูล" ไม่ใช่ HTML

สร้าง `public/fields.js` เป็น **single source of truth** — browser import ไปสร้าง UI, server import ไป validate + ประกอบข้อความ

```js
export const FIELDS = [
  { key: 'reporterName', label: 'ชื่อผู้แจ้ง', type: 'text', max: 100 },
  // TODO: เริ่มแค่ 4–5 ฟิลด์พอ ยังไม่ต้อง 17 ข้อ
];
```

**ทำไมต้องทำแบบนี้แทนเขียน `<input>` ตรง ๆ:** เพิ่มฟิลด์ใหม่ = แก้ที่เดียว
ถ้าเขียน HTML กับ validation แยกกัน วันหนึ่งจะลืมแก้ฝั่งใดฝั่งหนึ่งแน่นอน

**ตัดสินใจตอนนี้เลย:** `type` จะรองรับอะไรบ้าง (`text` / `tel` / `textarea` / `datetime-local` / `choice`)
แต่ละ type จะ render ยังไง และ **ส่งค่ากลับมาเป็นรูปแบบไหน**

---

## Phase 5 — render ฟอร์มจาก FIELDS

```js
// TODO: วน FIELDS สร้าง DOM ตาม type
// TODO: collectFields() → อ่านค่าทุกช่อง + คืนรายการที่ยังไม่กรอก
// TODO: validate ฝั่ง client → ไฮไลต์แดง + scroll ไปข้อแรกที่ขาด
// TODO: draft ลง localStorage ทุกครั้งที่พิมพ์ + โหลดคืนตอนเปิดหน้า + ล้างเมื่อส่งสำเร็จ
```

**ทำไม draft สำคัญกับ LIFF เป็นพิเศษ:** หน้า LIFF ถูกปิด/รีเฟรชง่ายมาก (สายหลุด, สลับแอป, โดน login redirect)
กรอก 15 ข้อแล้วหายคือเหตุผลอันดับหนึ่งที่คนเลิกใช้ระบบ

**เช็คพอยต์:** ทำงานได้เต็มรูปแบบบน localhost ในโหมดทดสอบ (ยังไม่ต้อง deploy)

---

## Phase 6 — `POST /api/report` → push เข้ากลุ่ม

```js
export async function onRequestPost({ request, env }) {
  // TODO: อ่าน body (JSON ก่อน ค่อยเปลี่ยนเป็น multipart ตอนทำรูปใน Phase 7)
  // TODO: profile = await verifyLiffUser(env, accessToken)
  // TODO: validateFields() — ซ้ำอีกชั้นฝั่ง server
  // TODO: buildReportText(fields, profile?.displayName) → .slice(0, 5000)
  // TODO: pushMessages(env, env.LINE_GROUP_ID, [{ type:'text', text }])
}
```

**ลำดับการตรวจต้องเป็น: token → fields → ค่อยส่ง** (ล้มเร็วก่อนเปลืองทรัพยากร)

**ทำไมต้อง validate ซ้ำทั้งที่ client ตรวจแล้ว:** client validation คือ UX ส่วน server validation คือความถูกต้องจริง
คนที่ยิง `/api/report` ตรง ๆ ไม่ผ่านหน้าเว็บเลยก็มี

**แยก error 4xx กับ 5xx ให้ชัด** — ลองเขียน `class HttpError extends Error` ที่พก `status` มาด้วย
4xx = ข้อความส่งให้ผู้ใช้อ่านได้ / 5xx = log stack ไว้ดูเอง อย่าโชว์ผู้ใช้

**เช็คพอยต์:** deploy แล้วกรอกจากมือถือ → ข้อความเข้ากลุ่มพร้อมชื่อผู้ส่ง = จบ POC

---

## Phase 7 — แนบรูป (ทำต่อเมื่อ Phase 6 เสร็จสนิทแล้ว)

phase นี้ยากที่สุดและเป็นที่มาของบั๊กใน `safety-poc` — แยกออกมาต่างหากจงใจ

- [ ] เปลี่ยน `/api/report` จาก JSON เป็น **multipart** (`request.formData()`)
- [ ] ฝั่ง browser: ย่อรูปด้วย canvas เป็น 2 ขนาด (ต้นฉบับ ≤10MB, preview ≤1MB)
- [ ] ฝั่ง server: ตรวจ **magic bytes `FF D8 FF`** ไม่เชื่อ content-type จาก client
- [ ] เพิ่ม R2 binding ใน `wrangler.toml` → เขียนไฟล์ `<uuid>.jpg` + `<uuid>_p.jpg`
- [ ] **เขียน route `/uploads/[id].js` อ่านจาก R2** ← ข้อนี้ `safety-poc` ลืม รูปเลยเสีย
- [ ] ส่ง image message ต่อท้าย text (รวมกันแล้วแบ่งชุดละ 5)

**ทำไมต้องย่อรูปฝั่ง browser:** หน้างานใช้ 4G รูปจากมือถือใบละ 5MB — ย่อก่อนส่งลดเวลาอัปโหลดหลายเท่า
และการันตีว่าไม่ชนลิมิตของ LINE ตั้งแต่ก่อนออกจากเครื่อง

**กับดัก:** ทาพื้นขาวบน canvas ก่อนวาด ไม่งั้น PNG โปร่งใสจะกลายเป็นพื้นดำตอนแปลงเป็น JPEG

---

## Phase 8 — ปิดประตูก่อนใช้จริง

รวมหนี้ที่ก่อไว้ระหว่างทาง ทั้งหมดเป็นแบบ "ลืมแล้วไม่มีใครรู้"

- [ ] `LINE_CHANNEL_SECRET` ไม่มี → webhook รับทุก request
- [ ] `LINE_LOGIN_CHANNEL_ID` ไม่มี → ใครก็ยิง `/api/report` เข้ากลุ่มได้
- [ ] `NOTIFY_SECRET` ไม่มี → `/api/notify` เปิดทิ้ง
- [ ] ตั้ง secret บน production จริง ๆ ด้วย `npx wrangler pages secret put <NAME>`
- [ ] ตัดสินใจ: production ที่ตั้งค่าไม่ครบ ควร **ตายดัง ๆ** หรือ **เปิดทิ้งเงียบ ๆ**
- [ ] rate limit `/api/report` (ตอนนี้ยิงรัวได้ไม่จำกัด → เปลือง push quota)

---

## สรุปลำดับและจุดพัก

```
Phase 0 ────► reply ทำงานจริง          [ทดสอบ: localhost + LINE]
Phase 1 ────► มี LIFF_ID ในมือ          [ไม่มีโค้ด]
Phase 2 ────► เห็นชื่อตัวเองในหน้า LIFF   [ต้อง deploy]
Phase 3 ────► server รู้ว่าใครส่ง        [ต้อง deploy]
Phase 4–5 ──► ฟอร์มกรอกได้ครบ          [localhost โหมดทดสอบ]
Phase 6 ────► ข้อความเข้ากลุ่ม          [★ POC สมบูรณ์]
Phase 7 ────► แนบรูปได้                [ของแถม]
Phase 8 ────► ปิดช่องโหว่              [ก่อนใช้จริง]
```

**Phase 6 คือเส้นชัยของ POC** — 7 กับ 8 ทำเมื่อมีเวลา
ถ้าเวลาจำกัด ให้ข้าม Phase 7 ไปทำ 8 เลย ดีกว่ามีรูปแต่ API เปิดทิ้ง
