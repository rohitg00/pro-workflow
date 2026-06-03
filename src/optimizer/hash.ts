import { createHash } from 'node:crypto';

export function skillHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 16);
}
