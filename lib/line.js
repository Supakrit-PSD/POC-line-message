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

export async function verifyLiffUser(env, accessToken) {
    if(!env || !env.LINE_LOGIN_CHANNEL_ID){
        return null
    }
    if(!accessToken) throw new Error('missing LIFF access token');

    const verifyRes = await fetch(`${LINE_API}/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`)

    const info = await verifyRes.json().catch(() => ({}));

    if (!verifyRes.ok || info.client_id !== String(env.LINE_LOGIN_CHANNEL_ID) || !(info.expires_in > 0)) {
        throw new Error('invalid LIFF access token');
    }

    const profileRes = await fetch(`${LINE_API}/v2/profile`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    if (!profileRes.ok) {
        throw new Error('cannot read LINE profile');
    }
  return await profileRes.json();

}