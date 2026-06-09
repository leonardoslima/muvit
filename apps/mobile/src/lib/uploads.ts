export type UploadApiClient = {
  request: (path: string, init?: RequestInit) => Promise<PresignedUpload>;
};

export type UploadFetcher = (input: string, init?: RequestInit) => Promise<Response>;

type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  fields: Record<string, never>;
};

export type AssessmentPhoto = {
  uri: string;
  contentType: 'image/jpeg' | 'image/png';
};

export async function uploadAssessmentPhoto({
  api,
  photo,
  fetcher = fetch,
}: {
  api: UploadApiClient;
  photo: AssessmentPhoto;
  fetcher?: UploadFetcher;
}): Promise<string> {
  const presignedUpload = await api.request('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ kind: 'assessment-photo', contentType: photo.contentType }),
  });

  const fileResponse = await fetcher(photo.uri);
  if (!fileResponse.ok) {
    throw new Error('Falha ao ler a foto selecionada.');
  }

  const uploadResponse = await fetcher(presignedUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': photo.contentType },
    body: await fileResponse.blob(),
  });
  if (!uploadResponse.ok) {
    throw new Error('Falha ao enviar foto.');
  }

  return presignedUpload.publicUrl;
}
