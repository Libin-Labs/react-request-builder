import type * as React from 'react';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export interface RequestPair {
  name: string;
  value: string;
  enabled?: boolean;
}
export interface RequestDefinition {
  method: HttpMethod;
  url: string;
  query: RequestPair[];
  headers: RequestPair[];
  body: string;
}
export interface BuiltRequest {
  url: string;
  init: RequestInit;
}
export interface RequestErrorDetails {
  kind: 'validation' | 'network' | 'http';
  status?: number;
}

export class RequestBuilderError extends Error {
  readonly kind: RequestErrorDetails['kind'];
  readonly status?: number;

  constructor(message: string, details: RequestErrorDetails) {
    super(message);
    this.name = 'RequestBuilderError';
    this.kind = details.kind;
    this.status = details.status;
  }
}

export function createEmptyRequest(): RequestDefinition {
  return { method: 'GET', url: 'https://api.example.com', query: [], headers: [], body: '' };
}

export function buildRequest(request: RequestDefinition): BuiltRequest {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    throw new RequestBuilderError('Enter a valid absolute URL.', { kind: 'validation' });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RequestBuilderError('Only HTTP and HTTPS URLs are supported.', {
      kind: 'validation',
    });
  }
  if (url.username || url.password)
    throw new RequestBuilderError('Credentials in the URL are not supported.', {
      kind: 'validation',
    });
  const method = request.method.toUpperCase() as HttpMethod;
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
    throw new RequestBuilderError(`Unsupported HTTP method "${request.method}".`, {
      kind: 'validation',
    });
  }
  for (const pair of request.query) {
    if (pair.enabled !== false && pair.name) url.searchParams.append(pair.name, pair.value);
  }
  const headers = new Headers();
  for (const header of request.headers) {
    if (header.enabled === false || !header.name.trim()) continue;
    try {
      headers.append(header.name, header.value);
    } catch {
      throw new RequestBuilderError(`Invalid header name or value for "${header.name}".`, {
        kind: 'validation',
      });
    }
  }
  const body = request.body.length > 0 ? request.body : undefined;
  if ((method === 'GET' || method === 'HEAD') && body !== undefined) {
    throw new RequestBuilderError(`${method} requests cannot include a body.`, {
      kind: 'validation',
    });
  }
  if (body !== undefined && !headers.has('content-type'))
    headers.set('content-type', 'application/json');
  return {
    url: url.toString(),
    init: { method, headers, ...(body === undefined ? {} : { body }) },
  };
}

export async function sendRequest(
  request: RequestDefinition,
  options: { signal?: AbortSignal; fetch?: typeof fetch } = {},
): Promise<Response> {
  const built = buildRequest(request);
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== 'function')
    throw new RequestBuilderError('Fetch is not available in this environment.', {
      kind: 'network',
    });
  try {
    const response = await fetcher(built.url, { ...built.init, signal: options.signal });
    if (!response.ok)
      throw new RequestBuilderError(`Request failed with HTTP ${response.status}.`, {
        kind: 'http',
        status: response.status,
      });
    return response;
  } catch (error) {
    if (error instanceof RequestBuilderError) throw error;
    if (options.signal?.aborted) throw error;
    throw new RequestBuilderError('The request could not be completed.', { kind: 'network' });
  }
}

export interface RequestBuilderProps {
  value: RequestDefinition;
  onChange: (value: RequestDefinition) => void;
  className?: string;
}

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function PairList({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: RequestPair[];
  onChange: (rows: RequestPair[]) => void;
}): React.ReactElement {
  return (
    <section className="lp-request__pair-section">
      <div className="lp-request__section-title">
        <h3>{label}</h3>
        <button
          type="button"
          onClick={() => onChange([...rows, { name: '', value: '', enabled: true }])}
        >
          Add {label.toLowerCase().replace(/s$/, '')}
        </button>
      </div>
      {rows.length === 0 && <p className="lp-request__empty">No {label.toLowerCase()} added.</p>}
      {rows.map((row, index) => (
        <div className="lp-request__pair" key={index}>
          <label className="lp-request__enabled">
            <input
              aria-label={`${label} row ${index + 1} enabled`}
              type="checkbox"
              checked={row.enabled !== false}
              onChange={(event) =>
                onChange(
                  rows.map((item, i) =>
                    i === index ? { ...item, enabled: event.target.checked } : item,
                  ),
                )
              }
            />{' '}
            Enabled
          </label>
          <label>
            Name
            <input
              aria-label={`${label} row ${index + 1} name`}
              value={row.name}
              onChange={(event) =>
                onChange(
                  rows.map((item, i) =>
                    i === index ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
            />
          </label>
          <label>
            Value
            <input
              aria-label={`${label} row ${index + 1} value`}
              value={row.value}
              onChange={(event) =>
                onChange(
                  rows.map((item, i) =>
                    i === index ? { ...item, value: event.target.value } : item,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            aria-label={`Remove ${label.toLowerCase()} row ${index + 1}`}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            Remove
          </button>
        </div>
      ))}
    </section>
  );
}

export function RequestBuilder({
  value,
  onChange,
  className,
}: RequestBuilderProps): React.ReactElement {
  let preview: string;
  let error = '';
  try {
    const built = buildRequest(value);
    preview = `${built.init.method} ${built.url}`;
  } catch (failure) {
    preview = 'Resolve validation errors to preview the request.';
    error = failure instanceof Error ? failure.message : 'Invalid request.';
  }
  return (
    <section className={`lp-request ${className ?? ''}`} aria-label="HTTP request builder">
      <header className="lp-request__header">
        <div>
          <h2>Request builder</h2>
          <p>Compose a request. Network calls are never automatic.</p>
        </div>
      </header>
      <div className="lp-request__primary">
        <label>
          Method
          <select
            value={value.method}
            onChange={(event) => onChange({ ...value, method: event.target.value as HttpMethod })}
          >
            {methods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label className="lp-request__url">
          URL
          <input
            value={value.url}
            placeholder="https://example.com/resource"
            onChange={(event) => onChange({ ...value, url: event.target.value })}
          />
        </label>
      </div>
      <PairList
        label="Query parameters"
        rows={value.query}
        onChange={(query) => onChange({ ...value, query })}
      />
      <PairList
        label="Headers"
        rows={value.headers}
        onChange={(headers) => onChange({ ...value, headers })}
      />
      <label className="lp-request__body">
        Body
        <textarea
          value={value.body}
          placeholder="Optional request body"
          rows={6}
          onChange={(event) => onChange({ ...value, body: event.target.value })}
        />
      </label>
      {error && (
        <p className="lp-request__error" role="alert">
          {error}
        </p>
      )}
      <div className="lp-request__preview">
        <h3>Request preview</h3>
        <code>{preview}</code>
        <p>
          Use <code>buildRequest</code> to inspect the request or call <code>sendRequest</code>{' '}
          explicitly to fetch.
        </p>
      </div>
    </section>
  );
}
