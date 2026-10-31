const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://test.local/' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.MouseEvent = dom.window.MouseEvent;
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const requestApi = require('../dist/cjs/index.js');

const request = {
  method: 'POST',
  url: 'https://example.test/items?existing=one',
  query: [
    { name: 'filter', value: 'a b' },
    { name: 'skip', value: 'yes', enabled: false },
  ],
  headers: [{ name: 'x-mode', value: 'safe' }],
  body: '{"ok":true}',
};

test('builds safe HTTP requests and rejects invalid input', () => {
  const built = requestApi.buildRequest(request);
  assert.equal(built.url, 'https://example.test/items?existing=one&filter=a+b');
  assert.equal(built.init.method, 'POST');
  assert.equal(built.init.headers.get('x-mode'), 'safe');
  assert.equal(built.init.headers.get('content-type'), 'application/json');
  assert.equal(built.init.body, request.body);
  assert.throws(
    () => requestApi.buildRequest({ ...request, url: 'javascript:alert(1)' }),
    /HTTP and HTTPS/,
  );
  assert.throws(
    () => requestApi.buildRequest({ ...request, method: 'GET' }),
    /cannot include a body/,
  );
  assert.throws(
    () => requestApi.buildRequest({ ...request, headers: [{ name: 'bad\nheader', value: 'x' }] }),
    /Invalid header/,
  );
});

test('ESM and CommonJS entry points expose the same API', async () => {
  const esm = await import('../dist/esm/index.js');
  assert.deepEqual(Object.keys(esm).sort(), Object.keys(requestApi).sort());
});

test('fetch integration is explicit, abortable, and exposes bounded errors', async () => {
  let called = false;
  const okFetch = async (url, init) => {
    called = true;
    assert.match(url, /filter=a\+b/);
    assert.equal(init.signal instanceof AbortSignal, true);
    return new Response('ok', { status: 200 });
  };
  const controller = new AbortController();
  const response = await requestApi.sendRequest(request, {
    fetch: okFetch,
    signal: controller.signal,
  });
  assert.equal(called, true);
  assert.equal(response.status, 200);
  await assert.rejects(
    requestApi.sendRequest(request, {
      fetch: async () => new Response('sensitive body', { status: 403 }),
    }),
    (error) =>
      error.kind === 'http' && error.status === 403 && !error.message.includes('sensitive body'),
  );
  await assert.rejects(
    requestApi.sendRequest(request, {
      fetch: async () => {
        throw new Error('private low-level details');
      },
    }),
    (error) => error.kind === 'network' && !error.message.includes('private low-level details'),
  );
});

test('controlled request editor emits edits without sending', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let updated;
  await act(async () =>
    root.render(
      React.createElement(requestApi.RequestBuilder, {
        value: requestApi.createEmptyRequest(),
        onChange: (value) => {
          updated = value;
        },
      }),
    ),
  );
  const addQuery = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Add query parameter',
  );
  await act(async () => addQuery.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(updated.query.length, 1);
  assert.equal(host.querySelector("button[aria-label*='send' i]"), null);
  await act(async () => root.unmount());
  host.remove();
});
