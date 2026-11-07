/**
 * backup.js (Postgres version, Render-safe)
 *
 * Options:
 *  - backup        (schema + data, safe for Render)
 *  - backup-data   (data-only)
 *  - restore [f]   (restore from latest or given file)
 *  - restore-and-dev [f]
 *
 * Any failure exits non-zero, so a scheduled job can't look green without a
 * backup. Set these for scheduled runs:
 *  - REQUIRE_UPLOAD=true: fail if there's nowhere to upload to.
 *  - BACKUP_VERIFY_DATABASE_URL: an empty, local database to test-restore into.
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");
const dotenv = require("dotenv");

const nodeEnv = process.env.NODE_ENV || "development";

// Load base .env
dotenv.config();

// Load .env.local (overrides base .env)
dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
  override: true,
});

// Load environment-specific file (e.g. .env.production) with top override priority
if (nodeEnv) {
  dotenv.config({
    path: path.resolve(process.cwd(), `.env.${nodeEnv}`),
    override: true,
  });
}

// Normalize DATABASE_URL if present
if (
  process.env.DATABASE_URL &&
  process.env.DATABASE_URL.startsWith("postgresql://")
) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /^postgresql:\/\//,
    "postgres://",
  );
}

// Parse DATABASE_URL if provided
let parsedHost = process.env.DB_HOST || "localhost";
let parsedUser = process.env.DB_USER || "postgres";
let parsedPassword = process.env.DB_PASSWORD || "secret";
let parsedName = process.env.DB_NAME || "crystal_clear_crm";
let parsedPort = process.env.DB_PORT || 5432;

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (url.hostname) parsedHost = url.hostname;
    if (url.port) parsedPort = url.port;
    if (url.username) parsedUser = decodeURIComponent(url.username);
    if (url.password) parsedPassword = decodeURIComponent(url.password);
    if (url.pathname) parsedName = url.pathname.replace(/^\//, "");
  } catch (e) {
    // Ignore invalid URL
  }
}

const DB_HOST = parsedHost;
const DB_USER = parsedUser;
const DB_PASSWORD = parsedPassword;
const DB_NAME = parsedName;
const DB_PORT = parsedPort;

const {
  B2_BUCKET,
  AWS_ENDPOINT,
  AWS_DEFAULT_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  REQUIRE_UPLOAD,
  BACKUP_VERIFY_DATABASE_URL,
} = process.env;

const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";
const KEEP_LAST = 7;

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(
      cmd,
      {
        env: { ...process.env, PGPASSWORD: DB_PASSWORD },
        maxBuffer: 50 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) return reject(new Error(stderr || error.message));
        resolve(stdout);
      },
    );
  });
}

function getLatestBackup() {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /\.(sql|dump)(\.gz)?$/.test(f))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);
  return files.length ? path.join(BACKUP_DIR, files[0].name) : null;
}

/** Older backups of the same kind beyond the newest `keep`. Other files are left alone. */
function selectBackupsToDelete(files, prefix, keep = KEEP_LAST) {
  return (files || [])
    .filter((file) => file.Key.startsWith(prefix))
    .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
    .slice(keep);
}

// A dump can be written successfully and still be useless, so check it holds the data.
async function checkDumpContents(filePath) {
  const contents = await runCommand(`pg_restore --list "${filePath}"`);
  if (!/TABLE DATA public customers/.test(contents)) {
    throw new Error(`${filePath} has no customer data`);
  }
}

async function countSourceCustomers() {
  const output = await runCommand(
    `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -tAc "SELECT count(*) FROM customers"`,
  );
  return Number(output.trim());
}

// Proves the backup can actually be restored, by doing it.
async function testRestore(filePath) {
  if (!BACKUP_VERIFY_DATABASE_URL) return;

  // This wipes the target, so it must never be able to reach a real database.
  const { hostname } = new URL(BACKUP_VERIFY_DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(hostname)) {
    throw new Error("BACKUP_VERIFY_DATABASE_URL must be a local database");
  }

  console.log("Test-restoring backup...");
  await runCommand(
    `pg_restore --no-owner --no-acl --clean --if-exists -d "${BACKUP_VERIFY_DATABASE_URL}" "${filePath}"`,
  );
  const output = await runCommand(
    `psql "${BACKUP_VERIFY_DATABASE_URL}" -tAc "SELECT count(*) FROM customers"`,
  );
  const restored = Number(output.trim());
  const source = await countSourceCustomers();
  if (source > 0 && restored === 0) {
    throw new Error(`restored 0 customers, but the source has ${source}`);
  }
  console.log(`✅ Test restore: ${restored} customers (source has ${source})`);
}

// 1️⃣ Backup
async function backup({ dataOnly = false } = {}) {
  if (REQUIRE_UPLOAD === "true" && !B2_BUCKET) {
    throw new Error("REQUIRE_UPLOAD is set, but B2_BUCKET is missing");
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = dataOnly ? "data-only" : "full";
  const ext = dataOnly ? "sql.gz" : "dump"; // 👈 don't gzip custom dumps
  const outFile = path.join(BACKUP_DIR, `${DB_NAME}-${suffix}-${ts}.${ext}`);

  const dumpCmd = dataOnly
    ? `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} \
       --data-only --no-owner --no-acl ${DB_NAME}`
    : `pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} \
       --no-owner --no-acl --clean --if-exists -Fc ${DB_NAME}`;

  console.log(`Creating ${suffix} backup...`);

  if (dataOnly) {
    // plain SQL → gzip it
    const plainFile = outFile.replace(/\.gz$/, "");
    await runCommand(`${dumpCmd} -f "${plainFile}"`);
    await pipeline(
      fs.createReadStream(plainFile),
      zlib.createGzip(),
      fs.createWriteStream(outFile),
    );
    fs.unlinkSync(plainFile);
  } else {
    // custom dump → write directly
    await runCommand(`${dumpCmd} -f "${outFile}"`);
    await checkDumpContents(outFile);
  }
  console.log(`Backup saved: ${outFile}`);

  // A failed test restore doesn't stop the upload, because this may still be the
  // best copy there is. It does stop older backups being deleted to make room.
  let restoreError = null;
  if (!dataOnly) {
    try {
      await testRestore(outFile);
    } catch (err) {
      restoreError = err;
    }
  }

  const s3 = getS3Client();
  if (!s3) {
    console.log("B2_BUCKET isn't set, so the backup stays local.");
  } else {
    await uploadToBackblaze(s3, outFile);
  }

  if (restoreError) {
    throw new Error(
      `Test restore failed, so older backups were kept: ${restoreError.message}`,
    );
  }
  if (s3) {
    await deleteOldBackups(s3, `${DB_NAME}-${suffix}-`);
  }
}

// 2️⃣ Restore
async function restore(filePath) {
  console.log(`Restoring from ${filePath}...`);
  let sqlFilePath = filePath;

  if (filePath.endsWith(".gz")) {
    const decompressed = filePath.replace(/\.gz$/, "");
    await pipeline(
      fs.createReadStream(filePath),
      zlib.createGunzip(),
      fs.createWriteStream(decompressed),
    );
    sqlFilePath = decompressed;
  }

  let restoreCmd;
  if (sqlFilePath.endsWith(".dump")) {
    restoreCmd = `pg_restore -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} \
      --no-owner --no-acl --clean --if-exists -d ${DB_NAME} "${sqlFilePath}"`;
  } else {
    restoreCmd = `psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} \
      -v ON_ERROR_STOP=1 -d ${DB_NAME} -f "${sqlFilePath}"`;
  }
  console.log(restoreCmd);

  try {
    await runCommand(restoreCmd);
    console.log("Restore complete!");
  } finally {
    if (sqlFilePath !== filePath) fs.unlinkSync(sqlFilePath);
  }
}

// 3️⃣ Restore and dev
async function restoreAndDev(filePath) {
  await restore(filePath);
  console.log("Starting dev server...");
  await runCommand("npm run dev");
}

function getS3Client() {
  if (!B2_BUCKET) return null;

  return new S3Client({
    region: AWS_DEFAULT_REGION || "us-east-005",
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true, // 👈 Backblaze requires this
    // Newer SDKs add checksums by default, which S3-compatible services may reject.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
}

async function uploadToBackblaze(s3, filePath) {
  const key = path.basename(filePath);
  const size = fs.statSync(filePath).size;

  await s3.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: fs.createReadStream(filePath),
      ContentLength: size,
    }),
  );

  // Only trust the upload, and only delete the local copy, once it's confirmed.
  const uploaded = await s3.send(
    new HeadObjectCommand({ Bucket: B2_BUCKET, Key: key }),
  );
  if (uploaded.ContentLength !== size) {
    throw new Error(
      `Upload of ${key} is ${uploaded.ContentLength} bytes, expected ${size}`,
    );
  }
  console.log(`✅ Uploaded ${key} → Backblaze B2 (${size} bytes)`);

  fs.unlinkSync(filePath);
  console.log(`🗑️  Local file deleted: ${filePath}`);
}

async function deleteOldBackups(s3, prefix) {
  const listResp = await s3.send(
    new ListObjectsV2Command({ Bucket: B2_BUCKET, Prefix: prefix }),
  );

  for (const file of selectBackupsToDelete(listResp.Contents, prefix)) {
    await s3.send(
      new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: file.Key }),
    );
    console.log(`🗑️  Deleted old backup from B2: ${file.Key}`);
  }
}

// CLI
async function main() {
  const [, , cmd, file] = process.argv;
  const f = file || getLatestBackup();
  switch (cmd) {
    case "backup":
      return backup();
    case "backup-data":
      return backup({ dataOnly: true });
    case "restore":
      if (!f) throw new Error("No backup file found!");
      return restore(f);
    case "restore-and-dev":
      if (!f) throw new Error("No backup file found!");
      return restoreAndDev(f);
    default:
      console.log("Commands:");
      console.log(
        "  node backup.js backup          # Full backup (schema+data)",
      );
      console.log("  node backup.js backup-data     # Data-only backup");
      console.log("  node backup.js restore [file]  # Restore backup");
      console.log(
        "  node backup.js restore-and-dev [file] # Restore then start dev",
      );
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("❌", err.message);
    process.exitCode = 1;
  });
}

module.exports = { selectBackupsToDelete };
