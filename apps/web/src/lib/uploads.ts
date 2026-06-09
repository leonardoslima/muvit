type UploadKind = 'assessment-photo' | 'avatar';
type SupportedContentType = 'image/jpeg' | 'image/png';

export type PresignUploadInput = {
  kind: UploadKind;
  contentType: SupportedContentType;
};

export type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  fields: Record<string, never>;
};

type PresignUpload = (input: PresignUploadInput) => Promise<PresignedUpload>;
export type UploadFetcher = (input: string, init?: RequestInit) => Promise<Response>;

export async function uploadFileWithPresignedUrl({
  file,
  kind,
  presign,
  fetcher = fetch,
}: {
  file: File;
  kind: UploadKind;
  presign: PresignUpload;
  fetcher?: UploadFetcher;
}): Promise<string> {
  const contentType = toSupportedContentType(file.type);
  if (!contentType) {
    throw new Error('Tipo de arquivo nao suportado.');
  }

  const presignedUpload = await presign({ kind, contentType });
  const response = await fetcher(presignedUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: file,
  });
  if (!response.ok) {
    throw new Error('Falha ao enviar arquivo.');
  }

  return presignedUpload.publicUrl;
}

function toSupportedContentType(value: string): SupportedContentType | null {
  if (value === 'image/jpeg' || value === 'image/png') return value;
  return null;
}
