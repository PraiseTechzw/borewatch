import React from "react";
import { RecordView, Section } from "./types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database,
  FileCheck2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  TrendingUp,
} from "lucide-react";

interface OverviewViewProps {
  records: RecordView[];
  applications: Array<{ stage: string }>;
  open: (section: Section) => void;
  inspections: Array<{ status: string; dueAt: Date | null }>;
  followUps: Array<{ status: string; dueAt: Date | null }>;
  loading?: boolean;
}

export function OverviewView({
  records,
  applications,
  open,
  inspections,
  followUps,
  loading = false,
}: OverviewViewProps) {
  const pendingInspections = inspections.filter((item) => item.status !== "submitted").length;
  const overdueActions = [...inspections, ...followUps].filter(
    (item) =>
      item.status !== "submitted" &&
      item.status !== "completed" &&
      item.dueAt &&
      new Date(item.dueAt).getTime() < Date.now()
  ).length;

  const underReviewCount = applications.filter((item) => item.stage === "under_review").length;
  const unableToAssessCount = records.filter(
    (record) => record.screeningStatus === "unable_to_assess"
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-xl border border-teal-200/70 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-5 sm:p-6 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PROTECTED REPOSITORY
              </span>
              <span className="text-xs text-teal-200/80">Neon PostgreSQL · Private S3 Storage</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Groundwater Oversight & Compliance Register
            </h2>
            <p className="text-sm text-teal-100/80 max-w-2xl leading-relaxed">
              Authorized tracking for {records.length} borehole assets. Operational status, formal intake, field inspections, and spatial screening rules remain strictly permission-isolated.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => open("Borehole register")}
              className="bg-white hover:bg-slate-100 text-teal-950 font-semibold shadow-sm hover:shadow"
            >
              <Database className="size-4 mr-1.5" />
              <span>Browse Records</span>
            </Button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 size-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Boreholes Metric */}
        <Card className="hover:border-teal-300 hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Boreholes
            </CardTitle>
            <div className="size-9 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800 flex items-center justify-center transition-transform group-hover:scale-105">
              <Database className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {records.length}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <span className="text-emerald-700 font-medium dark:text-emerald-400 flex items-center">
                <TrendingUp className="size-3 mr-0.5 inline" /> Synced
              </span>
              <span>· Database verified</span>
            </div>
          </CardContent>
        </Card>

        {/* Applications Metric */}
        <Card className="hover:border-sky-300 hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Applications
            </CardTitle>
            <div className="size-9 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800 flex items-center justify-center transition-transform group-hover:scale-105">
              <FileCheck2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {applications.length}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <span>{applications.filter((a) => a.stage === "draft").length} in draft status</span>
            </div>
          </CardContent>
        </Card>

        {/* Under Review Metric */}
        <Card className="hover:border-amber-300 hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Under Review
            </CardTitle>
            <div className="size-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center transition-transform group-hover:scale-105">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {underReviewCount}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <span className="text-amber-700 font-medium dark:text-amber-400">
                Awaiting officer review
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Spatial Screening Alert Metric */}
        <Card className="hover:border-rose-300 hover:shadow-md transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unable to Assess
            </CardTitle>
            <div className="size-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800 flex items-center justify-center transition-transform group-hover:scale-105">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {unableToAssessCount}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <span>Missing spatial layers / verification</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Queues Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Active Operational Queues
            </h3>
            <p className="text-xs text-muted-foreground">
              Prioritized tasks requiring action from officers and field inspectors.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Inspection Queue */}
          <Card
            onClick={() => open("Inspections")}
            className="cursor-pointer border-border hover:border-teal-400 hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-teal-600" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Field Work
                </span>
                <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200">
                  {pendingInspections} Pending
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold text-foreground group-hover:text-teal-700 transition-colors">
                Assigned Site Inspections
              </CardTitle>
              <CardDescription className="text-xs">
                {pendingInspections === 0
                  ? "All field checks submitted"
                  : `${pendingInspections} inspection(s) awaiting field completion`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs font-medium text-teal-700 group-hover:translate-x-0.5 transition-transform">
              <span>Open inspector worklist</span>
              <ArrowRight className="size-4" />
            </CardContent>
          </Card>

          {/* Follow-up Queue */}
          <Card
            onClick={() => open("Follow-up actions")}
            className="cursor-pointer border-border hover:border-amber-400 hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-amber-500" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Remediation & Review
                </span>
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                  {overdueActions} Overdue
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold text-foreground group-hover:text-amber-700 transition-colors">
                Follow-Up Actions
              </CardTitle>
              <CardDescription className="text-xs">
                {overdueActions === 0
                  ? "No actions overdue"
                  : `${overdueActions} urgent action(s) require escalation`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs font-medium text-amber-700 group-hover:translate-x-0.5 transition-transform">
              <span>Review action deadlines</span>
              <ArrowRight className="size-4" />
            </CardContent>
          </Card>

          {/* Applications Queue */}
          <Card
            onClick={() => open("Applications")}
            className="cursor-pointer border-border hover:border-sky-400 hover:shadow-md transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 h-1 w-full bg-sky-600" />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                  Intake & Permits
                </span>
                <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200">
                  {applications.filter((a) => ["submitted", "under_review", "information_requested"].includes(a.stage)).length} In Queue
                </Badge>
              </div>
              <CardTitle className="text-base font-semibold text-foreground group-hover:text-sky-700 transition-colors">
                Application Review
              </CardTitle>
              <CardDescription className="text-xs">
                Intake drafts, checklist verification, and human decision records.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-between text-xs font-medium text-sky-700 group-hover:translate-x-0.5 transition-transform">
              <span>Open application queue</span>
              <ArrowRight className="size-4" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Governance & Safe Spatial Screening Banner */}
      <Card className="border-border bg-slate-50/60 dark:bg-slate-900/30">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Authoritative Boundary & Spatial Integrity Notice
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl leading-relaxed">
                Screening calculations are strict distance-to-layer checks backed by verified WGS84 GeoJSON datasets. Missing, unverified, or stale layers explicitly return <em>"unable to assess"</em> rather than assuming hazard absence. Formal decisions require authenticated human delegation.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => open("GIS screening")}
            className="shrink-0 text-xs gap-1.5"
          >
            <MapPin className="size-3.5" />
            <span>View GIS Screening</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
