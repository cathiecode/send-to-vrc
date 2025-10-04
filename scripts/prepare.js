import fs from "fs";
import { Readable } from "stream";

// You can get source codes and license text at https://github.com/cathiecode/send-to-vrc-ffmpeg/releases/download/n8.0
const WINDOWS_FFMPEG_BINARY =
  "https://github.com/cathiecode/send-to-vrc-ffmpeg/releases/download/n8.0/ffmpeg.exe";
const FFMPEG_SOURCE_CODE =
  "https://github.com/cathiecode/send-to-vrc-ffmpeg/archive/refs/tags/n8.0.zip";

async function downloadFile(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.statusText}`);
  const fileStream = fs.createWriteStream(outputPath);
  await new Promise((resolve, reject) => {
    const stream = Readable.from(res.body);
    stream.pipe(fileStream);
    stream.on("error", reject);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
}

async function main() {
  await downloadFile(WINDOWS_FFMPEG_BINARY, "./src-tauri/resources/ffmpeg.exe");
  await downloadFile(
    FFMPEG_SOURCE_CODE,
    "./src-tauri/resources/ffmpeg-source-code.zip",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
