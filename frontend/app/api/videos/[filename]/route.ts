import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;

  // Sanitize filename to prevent path traversal
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".mp4")) {
    return new NextResponse("Invalid file type", { status: 400 });
  }

  // Look in candidate paths
  const candidatePaths = [
    path.join(process.cwd(), "..", "backend", "media", "videos", "dataset_100", safeFilename),
    path.join(process.cwd(), "..", "generated_100_deepfake_videos", safeFilename),
    path.join("/Users/iamsparsh00321/Desktop/newantigravworkfolder/generated_100_deepfake_videos", safeFilename),
    path.join(process.cwd(), "public", "dataset_100", safeFilename),
  ];

  let videoPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!videoPath) {
    // If on Render or external, redirect to backend media URL
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://netra-api-pmr7.onrender.com";
    return NextResponse.redirect(`${backendUrl}/api/v1/media/videos/dataset_100/${safeFilename}`);
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    const fileStream = fs.createReadStream(videoPath, { start, end });
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(readable, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } else {
    const fileStream = fs.createReadStream(videoPath);
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
}
