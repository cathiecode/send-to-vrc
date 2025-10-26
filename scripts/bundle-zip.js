import archiver from "archiver";
import fs, { cpSync, mkdirSync, readdirSync, rm, rmSync } from "fs";

function getVersion() {
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
  return packageJson.version;
}

function main() {
  try {
    rmSync("./bundle", { recursive: true, force: true });
    mkdirSync("./bundle");
    cpSync(
      `./src-tauri/target/release/bundle/nsis/Send to VRC_${getVersion()}_x64-setup.exe`,
      `./bundle/SendToVRC_${getVersion()}_Setup.exe`,
    );
    cpSync("./src-tauri/licenses", "./bundle/licenses", { recursive: true });

    // zip
    rmSync(`./SendToVRC_${getVersion()}.zip`, { force: true });
    const output = fs.createWriteStream(`./SendToVRC_${getVersion()}.zip`);
    const archive = archiver("zip");

    output.on("close", function () {
      console.log(archive.pointer() + " total bytes");
      console.log(
        "archiver has been finalized and the output file descriptor has closed.",
      );
    });

    archive.on("error", function (err) {
      throw err;
    });

    archive.pipe(output);
    archive.directory("./bundle/", false);
    archive.finalize();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
