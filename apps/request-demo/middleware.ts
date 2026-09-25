import { rewrite } from '@vercel/functions';
export const config = { matcher: '/demo/:run' };
export default async function middleware(request: Request) {
  const run = new URL(request.url).pathname.split('/').pop() || '';
  const ticket = request.headers.get('x-fixture-ticket') || '';
  const [expires, signature] = ticket.split('.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.FIXTURE_SECRET), {name:'HMAC',hash:'SHA-256'}, false, ['verify']);
  const bytes = /^[a-f0-9]{64}$/.test(signature || '') ? Uint8Array.from(signature.match(/../g)!.map(x=>parseInt(x,16))) : new Uint8Array();
  const validTicket = /^run-[a-f0-9-]{36}$/.test(run) && Number(expires)>Date.now() && Number(expires)<Date.now()+120000 && await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(`${run}|${expires}`));
  if (!validTicket) return new Response('Owned fixture ticket required', {status:403});
  const selected = (request.headers.get('cookie') || '').split(';').map(x=>x.trim()).filter(x=>x.startsWith('workshop_choice='));
  const value = selected.length === 1 ? selected[0].slice('workshop_choice='.length) : null;
  const valid = value === 'fixture-A' || value === 'fixture-B';
  const eventId = crypto.randomUUID();
  console.log(JSON.stringify({kind:'workshop-cookie-v1',run,eventId,cookieState:selected.length===0?'missing':valid?'valid':'invalid',cookie:valid?value:null}));
  return rewrite(`${process.env.COLLECTOR_URL}/origin/${run}`, {headers:{'x-workshop-event-id':eventId}});
}
