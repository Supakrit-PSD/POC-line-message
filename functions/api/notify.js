import { pushMessages } from "../../lib/line";

export async function onRequestPost({request, env}) {
    if(env.NOTIFY_SECRET){
        const apiKey = request.headers.get('x-api-key');
        if(apiKey !== env.NOTIFY_SECRET){
            return Response.json({
                ok: false,
                error: 'unauthorized'
            },{status: 401})
        }
    }

    let body;
    try{
        body = await request.json();
    } catch{
        return Response.json({
            ok: false,
            error: 'Invalid JSON'
        },{status : 400})
    }

    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 5000) : '';
    if(!text){
        return Response.json(
            {
                ok: false,
                error: 'Text Missing'
            },
            {
                status: 500
            }
        )
    }
    const groupId = (env.LINE_GROUP_ID || '').trim();
    if(!groupId){
        return Response.json(
            {
                ok: false,
                error: 'Not Found LINE_GroupID'
            },
            {
                status : 500
            }
        )
    }

    try{
        await pushMessages(env, groupId, [{
            type: 'text', text
        }]);
        return Response.json({
            ok:true
        })
    }catch (err){
        console.error('[notify]', err.message);
        return Response.json({
            ok: false,
            error: err.message
        },
        {
            status:502
        }
    )
    }
}
