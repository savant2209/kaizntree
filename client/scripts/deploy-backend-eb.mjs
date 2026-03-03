#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';
import dotenv from 'dotenv';
import { fromIni } from '@aws-sdk/credential-providers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  ElasticBeanstalkClient,
  CreateStorageLocationCommand,
  CreateApplicationVersionCommand,
  UpdateEnvironmentCommand,
} from '@aws-sdk/client-elastic-beanstalk';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(CLIENT_DIR, '..');
const INFRA_DIR = path.resolve(ROOT_DIR, 'infrastructure');
const SERVER_DIR = path.resolve(ROOT_DIR, 'server');
const TEMP_DIR = path.resolve(ROOT_DIR, '.deploy');

function readTerraformOutput(outputName) {
  try {
    return execSync(`terraform output -raw ${outputName}`, {
      cwd: INFRA_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
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

const REGION = process.env.AWS_REGION || 'us-east-1';
const APPLICATION_NAME =
  readTerraformOutput('elastic_beanstalk_application_name') || process.env.EB_APPLICATION_NAME || '';
const ENVIRONMENT_NAME =
  readTerraformOutput('elastic_beanstalk_environment_name') || process.env.EB_ENVIRONMENT_NAME || '';
const AWS_PROFILE = process.env.AWS_PROFILE || readTfvarsValue('aws_profile') || '';

if (!APPLICATION_NAME || !ENVIRONMENT_NAME) {
  console.error('[ERROR] Missing Elastic Beanstalk app/environment names.');
  console.error('Provide via Terraform outputs or .env: EB_APPLICATION_NAME / EB_ENVIRONMENT_NAME');
  process.exit(1);
}

if (!fs.existsSync(SERVER_DIR)) {
  console.error(`[ERROR] Backend directory not found: ${SERVER_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const versionLabel = `deploy-${new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')}`;
const zipPath = path.resolve(TEMP_DIR, `${versionLabel}.zip`);

const awsClientConfig = AWS_PROFILE
  ? { region: REGION, credentials: fromIni({ profile: AWS_PROFILE }) }
  : { region: REGION };

const s3 = new S3Client(awsClientConfig);
const eb = new ElasticBeanstalkClient(awsClientConfig);

async function createZipFromServer() {
  console.log('[INFO] Creating backend zip package...');

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.glob('**/*', {
      cwd: SERVER_DIR,
      dot: true,
      ignore: [
        'venv/**',
        '.venv/**',
        '__pycache__/**',
        '**/__pycache__/**',
        '.pytest_cache/**',
        '.mypy_cache/**',
        'db.sqlite3',
        '*.sqlite3',
        '.env',
        '*.log',
      ],
    });

    archive.finalize();
  });

  console.log(`[OK] Package generated: ${zipPath}`);
}

async function uploadAndDeploy() {
  const storage = await eb.send(new CreateStorageLocationCommand({}));
  const bucket = storage.S3Bucket;

  if (!bucket) {
    throw new Error('Elastic Beanstalk did not return an S3 storage bucket.');
  }

  const key = `deployments/${APPLICATION_NAME}/${path.basename(zipPath)}`;
  console.log(`[INFO] Uploading package to s3://${bucket}/${key}...`);

  const body = fs.readFileSync(zipPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/zip',
    }),
  );

  console.log('[INFO] Creating application version...');
  await eb.send(
    new CreateApplicationVersionCommand({
      ApplicationName: APPLICATION_NAME,
      VersionLabel: versionLabel,
      Description: `Automated deploy ${new Date().toISOString()}`,
      SourceBundle: {
        S3Bucket: bucket,
        S3Key: key,
      },
      Process: true,
    }),
  );

  console.log('[INFO] Updating environment to new version...');
  await eb.send(
    new UpdateEnvironmentCommand({
      EnvironmentName: ENVIRONMENT_NAME,
      VersionLabel: versionLabel,
    }),
  );

  console.log(`[OK] Backend deploy triggered. Version: ${versionLabel}`);
  console.log('[INFO] Elastic Beanstalk update is asynchronous and may take a few minutes.');
}

async function main() {
  console.log('[INFO] Backend deploy started');
  console.log(`[INFO] Region: ${REGION}`);
  console.log(`[INFO] Application: ${APPLICATION_NAME}`);
  console.log(`[INFO] Environment: ${ENVIRONMENT_NAME}`);
  if (AWS_PROFILE) {
    console.log(`[INFO] AWS profile: ${AWS_PROFILE}`);
  }

  await createZipFromServer();
  await uploadAndDeploy();
}

main().catch((error) => {
  console.error('[ERROR] Backend deploy failed:', error.message);
  process.exit(1);
});
