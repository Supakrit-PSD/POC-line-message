import { replyMessages } from "../lib/line";

async function verifySignature(secret, rawBody, signature) {
    if(!secret) return null
    if(!signature) return false
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        {name: 'HMAC', hash: 'SHA-256'},
        false,
        ['sign']
    );

    const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, rawBody));
    const given = base64ToBytes(signature);

    return given.length === expected.length && crypto.subtle.timingSafeEqual(given, expected);
}

async function handleEvents(env, events){
    for (const ev of events){
        if(ev.type !== 'message' || ev.message?.type !== 'text' || !ev.replyToken){
            console.log(`[webhook] skip event: type=${ev.type}, messageType=${ev.message?.type}, hasReplyToken=${Boolean(ev.replyToken)}`)
            continue
        }
        try{
        await replyMessages(env,ev.replyToken, [
            {
                type: 'text',
                text: ev.message.text
            },
        ]);
    }catch (err){
        console.error(`[webhook] reply error:`, err.message);
    }
    }

}

function base64ToBytes(b64) {
    try {
        return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch (e) {
        return new Uint8Array();
    }
}

export async function onRequestPost({ request, env, waitUntil}) {
    const rawBody = await request.arrayBuffer();
    const signature = request.headers.get('X-Line-Signature') || '';
    const secret = (env.LINE_CHANNEL_SECRET || '').trim();

    const signatureValid = await verifySignature(secret, rawBody, signature);

    if (signatureValid === false){
        console.error(`[webhook] invalid signature - secret length=${secret.length}, is32Hex=${/^[0-9a-f]{32}$/.test(secret)}`)
        return new Response('invalid signature', { status: 401})
    }
    
    const text = new TextDecoder().decode(rawBody);
    let body
    try {
        body = JSON.parse(text);
    }catch {
        body = text
    }
    console.log(JSON.stringify({
        receivedAt: new Date().toISOString(),
        signatureValid,
        headers: Object.fromEntries(request.headers),
        body,
    }))
    if(Array.isArray(body?.events)){
        waitUntil(handleEvents(env, body.events));
    }

    return Response.json({ ok: true});
}



