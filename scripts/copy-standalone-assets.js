const fs = require("node:fs");
const path = require("node:path");

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(source)) return;

  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  files.forEach((file) => {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  });
}

function main() {
  const rootDir = process.cwd();
  const standaloneDir = path.join(rootDir, ".next", "standalone");

  if (!fs.existsSync(standaloneDir)) {
    console.log("No .next/standalone directory found. Skipping asset copy.");
    return;
  }

  const publicSrc = path.join(rootDir, "public");
  const publicDest = path.join(standaloneDir, "public");
  if (fs.existsSync(publicSrc)) {
    console.log("Copying public/ to .next/standalone/public...");
    copyFolderRecursiveSync(publicSrc, publicDest);
  }

  const staticSrc = path.join(rootDir, ".next", "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    console.log("Copying .next/static/ to .next/standalone/.next/static...");
    copyFolderRecursiveSync(staticSrc, staticDest);
  }

  console.log("Standalone assets copied successfully.");
}

main();
