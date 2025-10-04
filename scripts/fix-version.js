import { spawnSync } from "child_process";
import fs from "fs";

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function bumpCargoTomlVersion(newVersion) {
  console.log("Running cargo.toml version", newVersion);
  const filePath = "src-tauri/Cargo.toml";

  let content = read(filePath);

  const versionRegex = /^version = \".*\" # @appversion$/m;

  if (!versionRegex.test(content)) {
    throw new Error(
      `Version line not found or does not match expected format in ${filePath}`,
    );
  }

  content = content.replace(
    versionRegex,
    `version = "${newVersion}" # @appversion`,
  );

  write(filePath, content);

  const result = spawnSync("cargo", ["update", "send-to-vrc"], {
    cwd: "src-tauri",
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(
      `Failed to run 'cargo update': ${result.stderr.toString()}`,
    );
  }
}

function bumpPackageJsonVersion(newVersion) {
  console.log("Running npm version", newVersion);

  const result = spawnSync(
    "npm",
    [
      "version",
      "--allow-same-version",
      "--no-git-tag-version",
      "--no-commit-hooks",
      newVersion,
    ],
    {
      stdio: "inherit",
      shell: true,
    },
  );

  console.dir(result);

  if (result.status !== 0) {
    throw new Error(
      `Failed to run 'npm version'(${result.status}): ${result.stdout} ${result.stderr}`,
    );
  }
}

function main() {
  const newVersion = process.argv[2];

  if (!newVersion) {
    console.error("Usage: node fix-version.js <new-version>");
    process.exit(1);
  }

  try {
    bumpCargoTomlVersion(newVersion);
    bumpPackageJsonVersion(newVersion);

    console.log(
      `Version updated to ${newVersion} in Cargo.toml and package.json`,
    );
  } catch (error) {
    console.error("Error updating version:", error.message);
    process.exit(1);
  }
}

main();
