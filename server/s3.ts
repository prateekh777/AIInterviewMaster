import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Validate required environment variables
const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BUCKET_NAME'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`[CHECKPOINT:ENV_MISSING] Missing required environment variable: ${envVar}`);
  }
}

// Initialize S3 client
let s3Client: S3Client;
try {
  s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  console.log(`[CHECKPOINT:S3_CLIENT] S3 client initialized successfully for region: ${process.env.AWS_REGION}`);
} catch (error) {
  console.error(`[CHECKPOINT:S3_CLIENT_FAILED] Failed to initialize S3 client: ${error}`);
  throw error;
}

/**
 * Upload a file to S3 with comprehensive error handling
 */
export async function uploadToS3(file: Buffer, key: string, contentType: string): Promise<string> {
  console.log(`[CHECKPOINT:S3_UPLOAD_START] Uploading file to S3: ${key} (${file.byteLength} bytes)`);
  
  try {
    // Create the command
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    // Send the upload command
    console.log(`[CHECKPOINT:S3_UPLOAD_SENDING] Sending upload request to S3 bucket: ${process.env.AWS_BUCKET_NAME}`);
    const result = await s3Client.send(command);
    
    console.log(`[CHECKPOINT:S3_UPLOAD_SUCCESS] File uploaded successfully: ${key}`);
    console.log(`[CHECKPOINT:S3_UPLOAD_DETAILS] ETag: ${result.ETag}, Version: ${result.VersionId || 'N/A'}`);
    
    // Generate a URL for the uploaded file
    return await getFileUrl(key);
  } catch (error: any) {
    console.error(`[CHECKPOINT:S3_UPLOAD_FAILED] Failed to upload file to S3: ${key}`);
    console.error(`[CHECKPOINT:S3_UPLOAD_ERROR] ${error.message}`);
    console.error(`[CHECKPOINT:S3_UPLOAD_STACK] ${error.stack}`);
    
    // Provide specific error information based on error type
    if (error.name === 'NoCredentialsError' || error.name === 'CredentialsProviderError') {
      console.error('[CHECKPOINT:S3_AUTH_ERROR] AWS credentials are invalid or missing');
    } else if (error.name === 'BucketNotFoundError') {
      console.error(`[CHECKPOINT:S3_BUCKET_ERROR] Bucket not found: ${process.env.AWS_BUCKET_NAME}`);
    } else if (error.$metadata?.httpStatusCode === 403) {
      console.error('[CHECKPOINT:S3_PERMISSION_ERROR] Permission denied - check IAM policies');
    }
    
    throw error;
  }
}

/**
 * Generate a signed URL for accessing an S3 object
 */
export async function getFileUrl(key: string): Promise<string> {
  console.log(`[CHECKPOINT:S3_URL_START] Generating signed URL for: ${key}`);
  
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    });

    // URL expires in 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log(`[CHECKPOINT:S3_URL_SUCCESS] Generated signed URL for: ${key}`);
    return url;
  } catch (error: any) {
    console.error(`[CHECKPOINT:S3_URL_FAILED] Failed to generate signed URL for: ${key}`);
    console.error(`[CHECKPOINT:S3_URL_ERROR] ${error.message}`);
    
    if (error.name === 'NoSuchKey') {
      console.error(`[CHECKPOINT:S3_KEY_NOT_FOUND] Object does not exist: ${key}`);
    }
    
    throw error;
  }
}