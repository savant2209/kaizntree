#!/usr/bin/env node

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { fromIni } from '@aws-sdk/credential-providers';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';
import { lookup } from 'mime-types';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.deploy') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, '..');
const INFRA_DIR = path.resolve(CLIENT_DIR, '../infrastructure');
const BUILD_DIR = path.resolve(CLIENT_DIR, 'dist');

function readTerraformOutputs() {
  try {
    const raw = execSync('terraform output -json', {
      cwd: INFRA_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (!raw) return {};

    const parsed = JSON.parse(raw);
    const result = {};

    for (const [key, value] of Object.entries(parsed)) {
      result[key] = value?.value;
    }

    return result;
  } catch {
    return {};
  }
}

function readTfvarsValue(key) {
  try {
    const tfvarsPath = path.join(INFRA_DIR, 'terraform.tfvars');
    if (!fs.existsSync(tfvarsPath)) return '';
    const content = fs.readFileSync(tfvarsPath, 'utf-8');
    const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, 'm'));
    return match?.[1]?.trim() || '';
  } catch {
    return '';
  }
}

const terraformOutputs = readTerraformOutputs();
const BUCKET = terraformOutputs.frontend_bucket_name || process.env.S3_BUCKET_CLOUDFRONT || '';
const DISTRIBUTION_ID = terraformOutputs.cloudfront_distribution_id || process.env.CLOUDFRONT_DISTRIBUTION_ID || '';
const REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_PROFILE = process.env.AWS_PROFILE || process.env.AWS_DEFAULT_PROFILE || readTfvarsValue('aws_profile') || '';

if (!BUCKET || !DISTRIBUTION_ID) {
  console.error('[ERROR] Missing deployment target values.');
  console.error('Provide via Terraform outputs or .env variables:');
  console.error('- frontend_bucket_name / S3_BUCKET_CLOUDFRONT');
  console.error('- cloudfront_distribution_id / CLOUDFRONT_DISTRIBUTION_ID');
  process.exit(1);
}

if (!fs.existsSync(BUILD_DIR)) {
  console.error(`[ERROR] Build directory not found: ${BUILD_DIR}`);
  console.error('Run `npm run build` first.');
  process.exit(1);
}

const awsClientConfig = AWS_PROFILE
  ? { region: REGION, credentials: fromIni({ profile: AWS_PROFILE }) }
  : { region: REGION };

const s3 = new S3Client(awsClientConfig);
const cloudfront = new CloudFrontClient(
  AWS_PROFILE
    ? { region: 'us-east-1', credentials: fromIni({ profile: AWS_PROFILE }) }
    : { region: 'us-east-1' },
);

function getCacheControl(key) {
  if (key === 'index.html') return 'public, max-age=0, must-revalidate';
  if (key.startsWith('assets/') || /\.[a-f0-9]{8}\.(js|css|woff2?|ttf|eot)$/i.test(key)) {
    return 'public, max-age=31536000, immutable';
  }
  if (/\.(jpg|jpeg|png|gif|svg|ico|webp)$/i.test(key)) return 'public, max-age=2592000';
  return 'public, max-age=3600';
}

async function cleanBucket() {
  let continuationToken;
  let deletedCount = 0;

  while (true) {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = list.Contents?.map((item) => ({ Key: item.Key })) ?? [];
    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: objects },
        }),
      );
      deletedCount += objects.length;
    }

    if (!list.IsTruncated) break;
    continuationToken = list.NextContinuationToken;
  }

  console.log(`[OK] Deleted ${deletedCount} old objects from S3`);
}

async function uploadFiles() {
  const files = await glob('**/*', { cwd: BUILD_DIR, nodir: true });

  for (const relativePath of files) {
    const filePath = path.join(BUILD_DIR, relativePath);
    const key = relativePath.replace(/\\/g, '/');
    const content = fs.readFileSync(filePath);
    const contentType = lookup(filePath) || 'application/octet-stream';

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: content,
        ContentType: contentType,
        CacheControl: getCacheControl(key),
      }),
    );
  }

  console.log(`[OK] Uploaded ${files.length} files to s3://${BUCKET}`);
}

async function invalidateCloudFront() {
  const response = await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: 1,
          Items: ['/*'],
        },
      },
    }),
  );

  console.log(`[OK] CloudFront invalidation created: ${response.Invalidation?.Id ?? 'N/A'}`);
}

async function main() {
  console.log('[INFO] Frontend deploy started');
  console.log(`[INFO] Bucket: ${BUCKET}`);
  console.log(`[INFO] Distribution: ${DISTRIBUTION_ID}`);
  if (AWS_PROFILE) {
    console.log(`[INFO] AWS profile: ${AWS_PROFILE}`);
  }

  await cleanBucket();
  await uploadFiles();
  await invalidateCloudFront();

  console.log('[OK] Frontend deploy completed');
}

main().catch((error) => {
  if (String(error?.message || '').includes('Could not load credentials from any providers')) {
    console.error('[ERROR] AWS credentials are not configured for this machine/session.');
    console.error('[HINT] Set AWS_PROFILE (or AWS_DEFAULT_PROFILE) and login with SSO:');
    console.error('[HINT] aws sso login --profile <your-profile>');
  }
  console.error('[ERROR] Frontend deploy failed:', error.message);
  process.exit(1);
});
