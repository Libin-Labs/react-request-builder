# @lp-labs/react-request-builder

Package version: `1.0.0`. Requires React `^18.2.0 || ^19.0.0`
as its only runtime peer. ESM and CommonJS named exports are provided.

```sh
npm install @lp-labs/react-request-builder react
```

A typed HTTP request model, URL and `RequestInit` generator, controlled React editor, and opt-in abortable fetch helper. Rendering or editing never sends a network request.

## Install and render

```tsx
import { RequestBuilder, createEmptyRequest } from "@lp-labs/react-request-builder";
import { useState } from "react";
import "@lp-labs/react-request-builder/style.css";

function Composer() {
  const [request, setRequest] = useState(createEmptyRequest());
  return <RequestBuilder value={request} onChange={setRequest} />;
}
```

The editor is controlled and emits a new `RequestDefinition` for each edit. Query parameters and headers can be disabled or removed. `className` adds a wrapper class; the stylesheet is optional. The built-in preview validates but never fetches.

### Complete props and exported types

`RequestBuilderProps` has required `value: RequestDefinition` and
`onChange: (value: RequestDefinition) => void`, plus optional `className?: string`
(no added class by default). There is no `defaultValue`, internal request store,
send button, or network callback. Feed each change back to `value`.

All runtime exports are named: `RequestBuilder`, `createEmptyRequest`,
`buildRequest`, `sendRequest`, and `RequestBuilderError`. Type-only exports:

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
interface RequestPair { name: string; value: string; enabled?: boolean }
interface RequestDefinition {
  method: HttpMethod;
  url: string;
  query: RequestPair[];
  headers: RequestPair[];
  body: string;
}
interface BuiltRequest { url: string; init: RequestInit }
interface RequestErrorDetails {
  kind: "validation" | "network" | "http";
  status?: number;
}
```

`createEmptyRequest(): RequestDefinition` creates a fresh
`{ method: "GET", url: "https://api.example.com", query: [], headers: [], body: "" }`.
`enabled` defaults to enabled unless exactly false. `buildRequest(request):
BuiltRequest` does not mutate the definition; it appends repeated query/header
names using native URLSearchParams/Headers behavior.

## Build or explicitly send

```ts
import {
  buildRequest, sendRequest,
  type RequestDefinition
} from "@lp-labs/react-request-builder";

const request: RequestDefinition = {
  method: "GET",
  url: "https://api.example.com/items?sort=recent",
  query: [{ name: "tag", value: "design" }],
  headers: [{ name: "accept", value: "application/json" }],
  body: ""
};

const built = buildRequest(request); // { url, init }
const controller = new AbortController();
const response = await sendRequest(request, { signal: controller.signal });
const result = await response.json(); // response parsing remains the caller's choice
```

`RequestDefinition` has `method`, absolute `url`, `query` and `headers` arrays of `{ name, value, enabled? }`, and a string `body`. Supported methods are `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`. Enabled non-empty query names are appended with `URLSearchParams`, preserving existing query entries. Enabled named headers are validated through the platform `Headers` API. A non-empty body gets a default JSON content type only when none is already present; GET and HEAD bodies are rejected. Only HTTP(S) URLs without embedded credentials are accepted.

`buildRequest` is pure and throws `RequestBuilderError` with `kind: "validation"` for invalid input. `sendRequest` performs fetch only when explicitly called; it accepts an optional abort signal and injectable fetch implementation for testing. It returns successful `Response` objects without parsing them. Non-2xx responses throw with `kind: "http"` and a status; network failures throw with `kind: "network"`. Abort errors are passed through. Errors do not include response bodies or request header values, and the package never logs secrets.

The full send signature is
`sendRequest(request: RequestDefinition, options?: { signal?: AbortSignal; fetch?: typeof fetch }): Promise<Response>`.
Options default to `{}`, using `globalThis.fetch` and no cancellation signal.
Missing fetch rejects with a network error. `RequestBuilderError(message: string,
details: RequestErrorDetails)` extends Error, sets name `"RequestBuilderError"`,
and exposes readonly `kind` and optional `status`. A rejected fetch is passed
through unchanged if the supplied signal is aborted; otherwise it becomes a
generic network error. Successful response bodies must still be consumed/closed
by the application; non-success response bodies are not exposed by the error.

For cancellation, keep the controller until work is done and call
`controller.abort()` when the owning view unmounts or the user cancels. There is
no automatic unmount cancellation, timeout, retry, or request concurrency limit.
Catch the returned promise to handle abort/network/HTTP failures.

## Accessibility and scope

Inputs and actions have labels, visible keyboard focus, and validation alerts. Customize `.lp-request` and `.lp-request__*` or use a custom stylesheet. This package deliberately does not implement authentication storage, retries, response parsing, request signing, code snippet generation, or a request history. Review requests and apply your own application security and CORS policies before sending.

URL, Headers, AbortSignal, RequestInit, and Response are platform APIs; use a
modern browser (and TypeScript ES/DOM declarations), or a compatible server host
for helpers. Node ambient types are not required. The root module also exports a
React component, so React must resolve even for helper-only imports. No globals
are accessed for network work until helpers/rendering run, and import never
fetches. Use the application's own React renderer. Large pair lists render in
full and large bodies stay in memory; no virtualization or performance
certification is provided. JSON content type is a default only: body text is not
JSON-parsed or schema-validated.

## Project

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
