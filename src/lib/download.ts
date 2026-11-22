import { toast } from "sonner";
import type { Job, OutputFormat } from "@/types";
import { getBlob } from "@/lib/db";
import { downloadBlob } from "@/lib/image";
import { filenameFor, truncateMiddle } from "@/lib/utils";

const FORMATS: Array<[string, OutputFormat]> = [
  ["jpeg", "jpeg"],
  ["jpg", "jpeg"],
  ["webp", "webp"],
  ["png", "png"],
];

export function formatFromType(type?: string): OutputFormat {
  if (!type) return "png";
  const sub = type.split("/")[1]?.toLowerCase() ?? "png";
  return FORMATS.find(([key]) => key === sub)?.[1] ?? "png";
}

export async function downloadJobResult(job: Job) {
  const blob = await getBlob(`res:${job.id}`);
  if (!blob) {
    toast.error("Result file is missing from storage", {
      description: "Re-run this image to generate it again.",
    });
    return;
  }
  downloadBlob(blob, filenameFor(job.name, formatFromType(job.resultType ?? blob.type)));
  toast.success("Download started", { description: truncateMiddle(filenameFor(job.name, formatFromType(blob.type)), 40) });
}

export async function downloadJobOriginal(job: Job) {
  const blob = await getBlob(`src:${job.id}`);
  if (!blob) {
    toast.error("Original file is missing from storage");
    return;
  }
  downloadBlob(blob, job.name);
}
