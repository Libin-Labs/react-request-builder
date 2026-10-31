import { buildRequest, type RequestDefinition } from '@lp-labs/react-request-builder';

const request: RequestDefinition = {
  method: 'GET',
  url: 'https://example.test',
  query: [],
  headers: [],
  body: '',
};
buildRequest(request);
