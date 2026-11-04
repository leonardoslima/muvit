import { randomUUID } from 'node:crypto';
import type { UploadContentType, UploadKind } from './use-cases/presign-upload.js';

const fileExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
} satisfies Record<UploadContentType, string>;

export function createUploadObjectKey(
  kind: UploadKind,
  profileId: string,
  contentType: UploadContentType,
  objectId: string = randomUUID(),
): string {
  return `${kind}/${profileId}/${objectId}.${fileExtensions[contentType]}`;
}
