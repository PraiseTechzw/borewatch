import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

let client: S3Client | undefined;

function getClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  if (!endpoint || !region) {
    throw new Error("Neon Object Storage is not configured; deploy the assets bucket and load its environment variables");
  }
  client ??= new S3Client({ endpoint, region, forcePathStyle: true });
  return client;
}

export async function uploadEvidence(key: string, body: Buffer, contentType: string) {
  await getClient().send(new PutObjectCommand({
    Bucket: ENV.storageBucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function deleteEvidence(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: ENV.storageBucket, Key: key }));
}

export async function getEvidenceUrl(key: string) {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: ENV.storageBucket,
      Key: key,
    }),
    { expiresIn: 300 },
  );
}
