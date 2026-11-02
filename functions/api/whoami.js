import { verifyLiffUser } from "../../lib/line"

export async function onRequestPost({ request, env }) {
    try{
        const body = await request.json()
        const profile = await verifyLiffUser(env, body.accessToken)
        return Response.json({ ok: true, profile });
    }catch(err){
        return Response.json({ ok: false, error: err.message }, { status: 401 });
    }
}