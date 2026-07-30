export function headersFromConfig(value: unknown): Headers {
  const headers = new Headers();

  if (value instanceof Headers) {
    value.forEach((headerValue, headerName) => headers.set(headerName, headerValue));
    return headers;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'string'
      ) {
        headers.set(entry[0], entry[1]);
      }
    }
    return headers;
  }

  if (value !== null && typeof value === 'object') {
    for (const [headerName, headerValue] of Object.entries(value)) {
      if (typeof headerValue === 'string') headers.set(headerName, headerValue);
    }
  }

  return headers;
}
