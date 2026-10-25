import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { isEvidenceMime } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Image as ImageIcon,
  Upload,
  ExternalLink,
  Shield,
  Loader2,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

const requiredApplicationDocuments = [
  "site_plan",
  "land_authority",
  "technical_details",
  "supporting_documents",
] as const;

interface EvidencePanelProps {
  entityType: "application" | "inspection" | "borehole";
  entityId: number;
  canUpload: boolean;
  showDocumentType?: boolean;
}

export function EvidencePanel({
  entityType,
  entityId,
  canUpload,
  showDocumentType = false,
}: EvidencePanelProps) {
  const evidence = trpc.borewatch.evidence.list.useQuery({
    entityType: entityType === "borehole" ? "borehole" : entityType,
    entityId,
  });

  const upload = trpc.borewatch.evidence.upload.useMutation({
    onSuccess: () => {
      toast.success("Evidence file securely stored in private object storage.");
      void evidence.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload evidence.");
    },
  });

  const [documentType, setDocumentType] = useState<string>(requiredApplicationDocuments[0]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    if (file.size < 1 || file.size > 10 * 1024 * 1024) {
      toast.error("File size must be between 1 byte and 10 MB.");
      return;
    }

    if (!isEvidenceMime(file.type)) {
      toast.error("Only PDF, JPEG, or PNG files are accepted.");
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }

    try {
      await upload.mutateAsync({
        entityType: entityType === "borehole" ? "borehole" : entityType,
        entityId,
        fileName: file.name,
        contentType: file.type,
        contentBase64: btoa(binary),
        documentType: showDocumentType ? documentType : undefined,
      });
    } catch {
      // toast shown via onError
    }
  };

  return (
    <div className="space-y-3.5 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-teal-700 dark:text-teal-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Private Supporting Evidence
          </h4>
        </div>
        <span className="text-[11px] text-muted-foreground/80">
          Max 10MB · Protected S3 links
        </span>
      </div>

      {canUpload && (
        <div className="bg-slate-50/70 dark:bg-slate-900/40 rounded-lg p-3 border border-dashed border-border/80 flex flex-wrap items-center gap-3">
          {showDocumentType && (
            <div className="flex items-center gap-2">
              <label htmlFor="evidence-doc-type" className="text-xs text-muted-foreground whitespace-nowrap">
                Category:
              </label>
              <select
                id="evidence-doc-type"
                aria-label="Document Category"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                {requiredApplicationDocuments.map((key) => (
                  <option key={key} value={key}>
                    {key.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700 px-3.5 py-1.5 text-xs font-medium cursor-pointer transition-colors shadow-2xs">
            {upload.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            <span>{upload.isPending ? "Encrypting & Uploading…" : "Upload Evidence File"}</span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={upload.isPending}
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>
        </div>
      )}

      {/* Files List */}
      {evidence.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      ) : evidence.error ? (
        <div className="flex items-center gap-2 p-3 text-xs text-amber-800 bg-amber-50 rounded-md border border-amber-200">
          <AlertCircle className="size-4 shrink-0" />
          <span>Evidence unavailable: {evidence.error.message}</span>
        </div>
      ) : evidence.data?.length ? (
        <div className="divide-y divide-border/60 rounded-lg border border-border/80 bg-card overflow-hidden">
          {evidence.data.map((file) => {
            const isPdf = file.contentType === "application/pdf";
            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-2.5 sm:px-3 hover:bg-muted/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800 flex items-center justify-center shrink-0 text-teal-700 dark:text-teal-400">
                    {isPdf ? (
                      <FileText className="size-4" />
                    ) : (
                      <ImageIcon className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate max-w-[220px] sm:max-w-md">
                      {file.fileName}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="capitalize">
                        {file.documentType?.replaceAll("_", " ") ?? "Supporting evidence"}
                      </span>
                      <span>·</span>
                      <span>{(file.byteSize / 1024).toFixed(1)} KB</span>
                      <span>·</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 shrink-0 hover:border-teal-400 hover:text-teal-700"
                  asChild
                >
                  <a href={file.downloadUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3" />
                    <span>View / Download</span>
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 text-center rounded-lg border border-border/70 bg-muted/20 text-muted-foreground text-xs">
          No private evidence documents attached yet.
        </div>
      )}
    </div>
  );
}
