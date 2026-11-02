# คู่มือเขียน POC-line-message ด้วยตัวเอง

เป้าหมาย: เขียน LINE bot ขั้นต่ำสุดบน Cloudflare Pages Functions **ด้วยมือตัวเอง**
จนเข้าใจทุกบรรทัด แล้วค่อยต่อยอดไปเป็นระบบแบบ `safety-poc-line`

กติกาของคู่มือนี้
- แต่ละขั้นบอก **เป้าหมาย → แนวคิด → สิ่งที่ต้องเขียนเอง → วิธีทดสอบ**
- โค้ดที่ให้คือ *โครง* กับ *ท่ายาก* เท่านั้น ส่วนที่เป็น `TODO:` ให้เขียนเอง
- "เฉลย" คือไฟล์ใน `../safety-poc-line/` — เปิดดู **หลัง** ลองเองแล้วเท่านั้น

---

## แผนที่ 7 ขั้น

| ขั้น | ได้อะไร | เฉลยอยู่ที่ |
|---|---|---|
| 0 | เข้าใจว่าทำไมต้องมี 2 channel | `docs/line-setup-th.md` |
| 1 | โครงโปรเจกต์รันได้ `npm run dev` | `package.json`, `wrangler.toml` |
| 2 | `POST /webhook` ตอบ 200 + log | `functions/webhook.js` |
| 3 | ตรวจลายเซ็น `X-Line-Signature` | `functions/webhook.js` |
| 4 | บอทตอบ echo ด้วย Reply API | `lib/line.js` |
| 5 | จับ intent แล้วตอบข้อความที่ต้องการ | `lib/line.js` |
| 6 | Push เข้ากลุ่มจาก HTTP endpoint ของเราเอง | `functions/api/report.js` |

---

## ขั้นที่ 0 — ปูพื้นก่อนแตะโค้ด

อ่าน `../safety-poc-line/docs/line-setup-th.md` ขั้นที่ 1–6 แล้วทำจริงใน LINE console

สิ่งที่ต้องได้ติดมือมา 2 ค่า (จาก **Messaging API channel** เท่านั้น):

| ค่า | หน้าตา | เอาไว้ทำอะไร |
|---|---|---|
| `LINE_CHANNEL_SECRET` | hex 32 ตัว | ตรวจว่า request มาจาก LINE จริง |
| `LINE_CHANNEL_ACCESS_TOKEN` | ยาวมาก | ใช้เรียก Reply/Push API |

**คำถามที่ต้องตอบตัวเองให้ได้ก่อนไปต่อ**
1. Reply API กับ Push API ต่างกันยังไง (คำใบ้: โควต้า + ใครเริ่มคุยก่อน)
2. `replyToken` ใช้ได้กี่ครั้ง อายุเท่าไร
3. LINE Login channel จำเป็นกับขั้น 1–6 ไหม (คำตอบ: ไม่ ยังไม่ต้องมี)

---

## ขั้นที่ 1 — โครงโปรเจกต์

สร้าง 3 ไฟล์นี้เองในโฟลเดอร์ `POC-line-message/`

```
POC-line-message/
├── package.json
├── wrangler.toml
├── .dev.vars          # ห้าม commit
├── public/
│   └── index.html     # หน้าเปล่า ๆ ก็ได้ Pages ต้องมี output dir
└── functions/
    └── webhook.js
```

`package.json` — เขียนเอง ต้องมี `"type": "module"` และ script `dev` / `deploy` / `logs`
`wrangler.toml` — ต้องมี `name`, `pages_build_output_dir = "public"`, `compatibility_date`

**ประเด็นที่ต้องเข้าใจ:** Cloudflare Pages ใช้ **file-based routing**
`functions/webhook.js` → `POST /webhook` อัตโนมัติ ไม่มีไฟล์ router เลย
ชื่อ export ก็คือ HTTP method: `onRequestPost`, `onRequestGet`, `onRequest` (ทุก method)

`.dev.vars` (รูปแบบเหมือน .env):
```
LINE_CHANNEL_SECRET=xxxx
LINE_CHANNEL_ACCESS_TOKEN=yyyy
```

ทดสอบ: `npm run dev` แล้วเปิด http://localhost:8788 ต้องไม่ error

---

## ขั้นที่ 2 — Webhook ที่ "รับแล้วจบ"

เป้าหมาย: LINE ยิงมา → เรา log ทุกอย่าง → ตอบ `200 {}` ทันที

เขียน `functions/webhook.js`:

```js
export async function onRequestPost({ request, env, waitUntil }) {
  // TODO: อ่าน body
  // TODO: log เป็น JSON บรรทัดเดียว (receivedAt, headers, body)
  return Response.json({});
}
```

**ประเด็นสำคัญที่ต้องตัดสินใจตั้งแต่ตอนนี้ (เพราะขั้น 3 จะย้อนกลับมาเจ็บ)**

อ่าน body ด้วยอะไร? `request.json()` สะดวกกว่า แต่ลายเซ็นของ LINE คำนวณจาก
**ไบต์ดิบของ body** ไม่ใช่ JSON ที่ parse แล้ว และ body อ่านได้ **ครั้งเดียว**
→ ต้อง `await request.arrayBuffer()` ก่อน แล้วค่อย decode + `JSON.parse` เอง

ทำไมต้องรีบตอบ 200? LINE มี timeout สั้น ถ้าช้าจะ retry/ตัด webhook
งานที่ช้า (เรียก API ตอบกลับ) ให้โยนเข้า `waitUntil(...)` — มันทำงานต่อหลังส่ง response แล้ว

ทดสอบ:
```bash
curl -X POST http://localhost:8788/webhook -H 'content-type: application/json' -d '{"events":[]}'
```
แล้วดู log ใน terminal ที่รัน `npm run dev`

จากนั้นเอา URL จริงไปใส่ใน LINE console → กดปุ่ม **Verify** (ปุ่มนี้ส่ง `events: []` มา)

---

## ขั้นที่ 3 — ตรวจลายเซ็น (ท่ายากของจริง)

LINE ส่ง header `X-Line-Signature` = `base64( HMAC-SHA256( channelSecret, rawBody ) )`
เราต้องคำนวณเองแล้วเทียบ ถ้าไม่ตรง = ไม่ใช่ LINE → `401`

Workers ไม่มี `require('crypto')` มีแต่ **Web Crypto** ซึ่งเป็น async ทั้งหมด:

```js
const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
);
const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, rawBody));
// TODO: แปลง signature (base64) → Uint8Array ด้วย atob
// TODO: เทียบด้วย crypto.subtle.timingSafeEqual(given, expected)
//       (ต้องเช็ค length เท่ากันก่อน ไม่งั้น throw)
```

**ให้ฟังก์ชันคืน 3 ค่า ไม่ใช่ 2** — ลองคิดเองก่อนว่าทำไม:
- `null` = ไม่ได้ตั้ง secret → ข้ามการตรวจ (dev สะดวก)
- `false` = ลายเซ็นผิด → 401
- `true` = ผ่าน

ข้อนี้คือ trade-off ด้านความปลอดภัยที่ต้องรู้ตัว: ลืมตั้ง secret บน production = ใครก็ยิง webhook เราได้

**กฎที่ห้ามพลาด:** เวลา log error ห้าม log ตัว secret ให้ log แค่ "ความยาว" กับ "รูปแบบตรง regex ไหม" พอ

ทดสอบแบบไม่ง้อ LINE — เซ็น body เองด้วย openssl:
```bash
BODY='{"events":[]}'; SECRET='ใส่ channel secret'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)
curl -X POST http://localhost:8788/webhook -H "X-Line-Signature: $SIG" -d "$BODY"
```
ลองแก้ `$SIG` ให้ผิดดู ต้องได้ 401

---

## ขั้นที่ 4 — ตอบกลับด้วย Reply API

สร้าง `lib/line.js` เก็บ helper กลาง (อย่าเขียน fetch ปนใน webhook.js)

```js
export const LINE_API = 'https://api.line.me';

export async function replyMessages(env, replyToken, messages) {
  // TODO: POST ${LINE_API}/v2/bot/message/reply
  //       headers: Content-Type + Authorization: Bearer <token>
  //       body: { replyToken, messages }
  // TODO: ถ้า !res.ok ให้ throw พร้อม status + body (จะได้ debug ออก)
}
```

แล้วใน `webhook.js`:

```js
function handleEvents(env, events) {
  for (const ev of events) {
    // TODO: ข้าม event ที่ไม่ใช่ message / ไม่ใช่ text / ไม่มี replyToken
    // TODO: reply ข้อความเดิมกลับไป (echo)
  }
}
```
เรียกด้วย `waitUntil(handleEvents(env, body.events))` **ก่อน** `return`

**กับดักที่เจอบ่อยตรงนี้**
- ลืม `try/catch` รอบ reply → error ใน `waitUntil` หายเงียบ
- copy token มาแล้วติด newline / เครื่องหมายคำพูด / คำว่า `Bearer ` → 401
  (`safety-poc` แก้ด้วยฟังก์ชัน `cleanSecret` — ลองเขียนเองดู)
- เอา **Channel secret** ไปใส่ช่อง access token → 401 ตลอด

ทดสอบ: ทักบอทใน LINE ต้องได้ข้อความเดิมกลับมา

---

## ขั้นที่ 5 — จับ intent แทนการ echo

echo มันไร้ประโยชน์ ทีนี้ทำให้ "พิมพ์คำบางคำ → ตอบข้อความที่เตรียมไว้"

```js
const KEY_WORDS = [/* TODO */];
export function isSomethingRequest(text) {
  // TODO: กันข้อความยาวเกินไป (เช่น > 120 ตัวอักษร) return false
  // TODO: lowercase + ลบช่องว่างทั้งหมด
  // TODO: ตัดคำที่ทำให้ false positive ออกก่อน
  // TODO: ต้องเจอคำ "หัวข้อ" และ (คำ "ขอ" หรือ คำ "ลิงก์") ถึงจะ true
}
```

**แนวคิดที่ควรซึมซับ:** เงื่อนไขแบบ `A && (B || C)` ทำให้ "เกิดอุบัติเหตุที่ไซต์"
ไม่ trigger แต่ "ขอฟอร์มแจ้งเหตุหน่อย" trigger — ถ้าใช้ `||` เฉย ๆ บอทจะพูดแทรกทั้งวัน
และภาษาไทยสะกดได้หลายแบบ (ลิงก์/ลิ้ง/ลิ๊ง) ต้องใส่ให้ครบ

เขียนเทสต์เร็ว ๆ ด้วย node ก็ได้ ลองป้อน 10 ประโยคจริงจากกลุ่มดูว่าแยกถูกไหม

---

## ขั้นที่ 6 — Push เข้ากลุ่ม

Reply ตอบได้เฉพาะตอนมีคนทัก ถ้าอยากให้ "ระบบเราส่งเองเมื่อไหร่ก็ได้" ต้องใช้ Push

สร้าง `functions/api/notify.js` → `POST /api/notify` รับ JSON `{ text }` แล้ว push เข้ากลุ่ม

```js
export async function onRequestPost({ request, env }) {
  // TODO: อ่าน JSON, validate ว่ามี text และไม่เกิน 5000 ตัวอักษร
  // TODO: POST ${LINE_API}/v2/bot/message/push  body: { to: env.LINE_GROUP_ID, messages }
}
```

**ข้อจำกัดที่ต้องเขียนโค้ดรองรับ**
- 1 request ส่งได้ไม่เกิน **5 messages** → ต้อง loop ทีละ 5
- ใส่ header `X-Line-Retry-Key: <uuid>` ใหม่ทุกชุด ให้ LINE กันข้อความซ้ำตอน retry
- ข้อความ text ยาวได้ 5000 ตัวอักษร → `.slice(0, 5000)`
- Push **กินโควต้า** ต่างจาก Reply ที่ฟรี
- `LINE_GROUP_ID` หาได้จาก log ขั้นที่ 2 (`events[].source.groupId`) — เชิญบอทเข้ากลุ่มแล้วพิมพ์อะไรก็ได้

**เรื่องความปลอดภัยที่ต้องคิดเอง:** ตอนนี้ใครรู้ URL ก็ยิงข้อความเข้ากลุ่มบริษัทได้
จะกันยังไง? (ทางเลือก: shared secret ใน header, LIFF access token แบบ `safety-poc`, IP allowlist)

---

## ต่อยอดหลังจบ 6 ขั้น

เรียงตามความยาก
1. `GET /api/config` + หน้า LIFF — เข้าใจ `liff.init()` / `liff.getAccessToken()`
2. ตรวจ access token ฝั่ง server ด้วย `/oauth2/v2.1/verify` (ดู `verifyLiffUser`)
3. รับไฟล์รูป multipart → เก็บ R2 → ส่ง image message
   (ประเด็น: ตรวจ magic bytes `FF D8 FF` ไม่เชื่อ content-type จาก client,
   ย่อรูปฝั่ง browser ด้วย canvas, ต้องมี route `/uploads/<id>.jpg` ให้ LINE มาโหลดได้ —
   ข้อนี้ `safety-poc` **ยังขาดอยู่** ดู `docs/overview-th.md` หัวข้อ 6 ข้อ 1)
4. แยก `fields.js` เป็น single source of truth ใช้ร่วม browser + server

---

## เช็คลิสต์ "เข้าใจจริงไหม"

ตอบได้โดยไม่เปิดโค้ด = ผ่าน

- [ ] ทำไมต้องอ่าน `arrayBuffer()` ไม่ใช่ `json()` ใน webhook
- [ waitUntil รอจนกว่า await จะเสร็จ ] `waitUntil` ต่างจาก `await` ธรรมดายังไง
- [ เพื่อระบุตัวตนว่า Account Line นั้นมีตัวนั้นจริงไหม และใช่ LINE รึป่าว ] ทำไม `verifySignature` ต้องคืน 3 ค่า
- [ ] Reply vs Push: โควต้า, ใครเริ่ม, token อายุเท่าไร
- [ไปดู LOG error เพื่อเช็คว่า error ไปลงโค้ดตรงส่วนไหน] ถ้าเจอ 401 จะไล่หาสาเหตุยังไง (มีกี่สาเหตุที่เป็นไปได้)
- [ ] file-based routing ของ Pages map ไฟล์ไหนเป็น URL อะไร
- [ เกิด error 401 ] ลืมตั้ง `LINE_CHANNEL_SECRET` บน production แล้วเกิดอะไรขึ้น
