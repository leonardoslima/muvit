export type UploadKind = 'assessment-photo' | 'avatar';
export type UploadContentType = 'image/jpeg' | 'image/png';
export type PresignUploadInput = {
  kind: UploadKind;
  contentType: UploadContentType;
};
export type PresignUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  fields: Record<string, never>;
};

export type UploadSigner = {
  presign(input: PresignUploadInput & { userId: string }): Promise<PresignUploadResult>;
};

export class PresignUploadUseCase {
  constructor(private readonly uploadSigner: UploadSigner) {}

  async execute(userId: string, input: PresignUploadInput) {
    return this.uploadSigner.presign({ ...input, userId });
  }
}
