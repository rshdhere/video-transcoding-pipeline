export function createCloudFrontUrl(domain: string, key: string) {
  const normalizedDomain = domain.replace(/\/+$/, "");
  const normalizedKey = key.replace(/^\/+/, "");

  return `https://${normalizedDomain}/${normalizedKey}`;
}
