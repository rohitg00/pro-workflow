export function stripFencesAndParse<T = unknown>(text: string): T | null {
  const stripped = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    return null;
  }
}
