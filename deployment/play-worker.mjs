const splendorApi = new Map([
  ['/api/v1/health', ['GET', 'HEAD']],
  ['/api/v1/ready', ['GET', 'HEAD']],
  ['/api/v1/session', ['GET', 'DELETE']],
  ['/api/v1/session/guest', ['POST']],
  ['/api/v1/commands', ['POST']],
  ['/api/v1/room-view', ['POST']],
]);

const splendorHost = 'https://web-api-production-4571.up.railway.app';
const wizzardHost = 'https://wizzard-room-server-production.up.railway.app';

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const origin = request.headers.get('Origin');
    const pathname = incoming.pathname;
    if (pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('WebSocket required', { status: 426 });
      }
      if (origin !== incoming.origin) return new Response('Forbidden', { status: 403 });
      return fetch(new Request(new URL('/ws' + incoming.search, wizzardHost), request));
    }
    if (pathname.startsWith('/api/')) {
      const methods = splendorApi.get(pathname);
      if (!methods) return new Response('Not found', { status: 404 });
      if (!methods.includes(request.method)) return new Response('Method not allowed', { status: 405 });
      const mutates = !['GET', 'HEAD'].includes(request.method);
      if ((origin && origin !== incoming.origin) || (mutates && !origin)) {
        return new Response('Forbidden', { status: 403 });
      }
      const forwardedHeaders = new Headers(request.headers);
      // The upstream allows its original web origin. Verify the new browser
      // origin above, then adapt it to the existing first-party API origin.
      if (origin) forwardedHeaders.set('Origin', splendorHost);
      const response = await fetch(new Request(new URL(pathname + incoming.search, splendorHost), {
        method: request.method,
        headers: forwardedHeaders,
        body: request.body,
        duplex: 'half',
        redirect: 'manual',
      }));
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(response.body, { status: response.status, headers });
    }
    if (pathname === '/') return Response.redirect(env.CATALOG_URL ?? 'https://xsjgames.com/', 302);
    return env.ASSETS.fetch(request);
  },
};
