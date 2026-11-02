export const LINE_API = 'https://api.line.me'

export function cleanSecret(value){
    return String(value || '').trim().replace(/^["']|["']$/g,'').replace(/^Bearer\s+/i,'').trim()
}

export async function replyMessages(env, replyToken, messages) {

    const token = cleanSecret(env.LINE_CHANNEL_ACCESS_TOKEN)
    const res = await fetch(`${LINE_API}/v2/bot/message/reply`, {
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({replyToken, messages}),
    })
    if (!res.ok) {
        throw new Error(`LINE reply failed: (${res.status}): ${await res.text()}`);
    }
}

export async function pushMessages(env , to, messages){
    const token = cleanSecret(env.LINE_CHANNEL_ACCESS_TOKEN);

    for(let i = 0; i < messages.length; i += 5){
        const batch = messages.slice(i, i+5);

        const res = await fetch(`${LINE_API}/v2/bot/message/push`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Line-Retry-Key': crypto.randomUUID(),
            },
            body: JSON.stringify({to, messages: batch}),
        });
        if (!res.ok){
            throw new Error(`LINE push failed ${res.status}: ${await res.text()}`);
        }
    }
}
