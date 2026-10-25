import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, FileCheck, HelpCircle, Shield, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replaceAll(" ", "_");

  // Determine styling based on status keyword
  if (
    normalized === "active" ||
    normalized === "approved" ||
    normalized === "completed" ||
    normalized === "verified" ||
    normalized === "reviewed" ||
    normalized === "no_configured_rule_triggered"
  ) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-medium px-2 py-0.5 gap-1.5 shadow-2xs",
          className
        )}
      >
        {showIcon && <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />}
        <span className="capitalize">{status.replaceAll("_", " ")}</span>
      </Badge>
    );
  }

  if (
    normalized === "under_review" ||
    normalized === "flagged_for_review" ||
    normalized === "information_requested" ||
    normalized === "follow_up_required" ||
    normalized === "pending_authority_validation" ||
    normalized === "under_investigation"
  ) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-medium px-2 py-0.5 gap-1.5 shadow-2xs",
          className
        )}
      >
        {showIcon && <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />}
        <span className="capitalize">{status.replaceAll("_", " ")}</span>
      </Badge>
    );
  }

  if (
    normalized === "rejected" ||
    normalized === "decommissioned" ||
    normalized === "cancelled" ||
    normalized === "stale"
  ) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-medium px-2 py-0.5 gap-1.5 shadow-2xs",
          className
        )}
      >
        {showIcon && <XCircle className="size-3 text-rose-600 dark:text-rose-400" />}
        <span className="capitalize">{status.replaceAll("_", " ")}</span>
      </Badge>
    );
  }

  if (
    normalized === "submitted" ||
    normalized === "in_progress" ||
    normalized === "registered" ||
    normalized === "decision_recorded"
  ) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 font-medium px-2 py-0.5 gap-1.5 shadow-2xs",
          className
        )}
      >
        {showIcon && <FileCheck className="size-3 text-sky-600 dark:text-sky-400" />}
        <span className="capitalize">{status.replaceAll("_", " ")}</span>
      </Badge>
    );
  }

  if (normalized === "unable_to_assess" || normalized === "unverified") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 font-medium px-2 py-0.5 gap-1.5 shadow-2xs",
          className
        )}
      >
        {showIcon && <HelpCircle className="size-3 text-slate-500" />}
        <span className="capitalize">{status.replaceAll("_", " ")}</span>
      </Badge>
    );
  }

  // Default fallback badge
  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-slate-100 text-slate-800 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-200 font-medium px-2 py-0.5 gap-1.5",
        className
      )}
    >
      {showIcon && <Clock className="size-3 text-slate-500" />}
      <span className="capitalize">{status.replaceAll("_", " ")}</span>
    </Badge>
  );
}
