import { rewrite } from '@vercel/functions';
export const config = { matcher: '/demo/:run' };
export default async function middleware(request: Request) {
  const run = new URL(request.url).pathname.split('/').pop() || '';
  const ticket = request.headers.get('x-fixture-ticket') || '';
  const browser = ticket.startsWith('b.');
  const pieces = ticket.split('.');
  const expires = browser ? pieces[1] : pieces[0];
  const slot = browser ? Number(pieces[2]) : 0;
  const signature = browser ? pieces[3] : pieces[1];
  if (!process.env.FIXTURE_SECRET) return new Response('Fixture is not configured', {status:503});
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(process.env.FIXTURE_SECRET), {name:'HMAC',hash:'SHA-256'}, false, ['verify','sign']);
  const bytes = /^[a-f0-9]{64}$/.test(signature || '') ? Uint8Array.from(signature.match(/../g)!.map(x=>parseInt(x,16))) : new Uint8Array();
  const signed = browser ? `browser|${run}|${expires}|${slot}` : `${run}|${expires}`;
  const validTicket = /^run-[a-f0-9-]{36}$/.test(run) && Number(expires)>Date.now() && Number(expires)<Date.now()+120000 && (!browser || (Number.isInteger(slot)&&slot>=1&&slot<=12)) && await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(signed));
  if (!validTicket) return new Response('Ticket invalid or expired. Get a fresh ticket without resetting the content URL.', {status:403});
  const eventId = crypto.randomUUID();
  if (browser) {
    const consumed = await fetch(`${process.env.COLLECTOR_URL}/api/service?op=consume&run=${run}`, {method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${process.env.SERVICE_SECRET}`},body:JSON.stringify({slot,expires:Number(expires),eventId}),signal:AbortSignal.timeout(15000)});
    if (!consumed.ok) return new Response(await consumed.text(), {status:consumed.status,headers:{'content-type':'application/json'}});
  }
  const selected = (request.headers.get('cookie') || '').split(';').map(x=>x.trim()).filter(x=>x.startsWith('workshop_choice='));
  const value = selected.length === 1 ? selected[0].slice('workshop_choice='.length) : null;
  const valid = value === 'fixture-A' || value === 'fixture-B';
  console.log(JSON.stringify({kind:'workshop-cookie-v1',run,eventId,...(browser?{slot}:{}),cookieState:selected.length===0?'missing':valid?'valid':'invalid',cookie:valid?value:null}));
  const upstream = new Headers(request.headers);
  upstream.delete('cookie');
  upstream.delete('authorization');
  if (browser) {
    const signature = new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`origin|${run}|${expires}|${eventId}`)));
    upstream.set('x-workshop-origin-ticket', `${expires}.${eventId}.${Array.from(signature).map(b=>b.toString(16).padStart(2,'0')).join('')}`);
  }
  return rewrite(`${process.env.COLLECTOR_URL}/origin/${run}`, {request:{headers:upstream},headers:{'x-workshop-event-id':eventId}});
}
