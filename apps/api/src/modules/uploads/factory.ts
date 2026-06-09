import { R2UploadSigner } from './r2-upload-signer.js';
import { PresignUploadUseCase } from './use-cases/presign-upload.js';

export function makeUploadsModule() {
  return {
    presignUpload: new PresignUploadUseCase(new R2UploadSigner()),
  };
}
