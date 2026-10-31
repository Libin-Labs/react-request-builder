import request = require('@lp-labs/react-request-builder');

const definition: request.RequestDefinition = {
  method: 'HEAD',
  url: 'https://example.test',
  query: [],
  headers: [],
  body: '',
};
request.buildRequest(definition);
