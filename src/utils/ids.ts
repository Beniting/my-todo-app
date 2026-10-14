import * as Crypto from 'expo-crypto';

/**
 * Generates a stable unique identifier (UUID v4)
 */
export function generateId(): string {
  if (Crypto.randomUUID) {
    return Crypto.randomUUID();
  }
  // Fallback if randomUUID is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
