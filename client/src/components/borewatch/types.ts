export type Section =
  | "Overview"
  | "Borehole register"
  | "Applications"
  | "GIS screening"
  | "Inspections"
  | "Follow-up actions"
  | "Reports"
  | "Notifications"
  | "Administration";

export type RecordView = {
  id: number;
  recordCode: string;
  district: string;
  siteName: string;
  purpose: string;
  operationalStatus: string;
  applicationStatus: string;
  screeningStatus: string;
  latitude: string;
  longitude: string;
  updatedAt: Date;
  createdBy: number;
  partyId?: number | null;
  locationDescription?: string | null;
  technicalDetailsJson?: string | null;
  commissionedAt?: Date | null;
  decommissionedAt?: Date | null;
  decommissionReason?: string | null;
};

export type HazardLayer = {
  layerKey: string;
  name: string;
  sourceKey: string;
  version: string;
  geometryJson: string | null;
  datasetDate: Date | null;
  coordinateReferenceSystem: string;
  coverageJson: string | null;
  accuracyNotes: string | null;
  licenseNotes: string | null;
  verificationStatus: string;
  active: boolean;
};

export type DataSource = {
  sourceKey: string;
  name: string;
  purpose: string;
  accessLevel: string;
  referenceOnly: boolean;
  accessStatus: string;
  metadataJson: string | null;
};

export type ScreeningRule = {
  ruleKey: string;
  name: string;
  version: string;
  jurisdiction: string;
  hazardType: string;
  conditionJson: string;
  sourceKey: string;
  sourceReference: string | null;
  explanation: string;
  active: boolean;
  approvedBy: string | null;
  effectiveAt: Date | null;
};

export type WorkspaceData = {
  layers: HazardLayer[];
  settings: {
    jurisdiction: string;
    coordinatingAuthority: string;
    localAuthorityLabel: string;
    localAuthorityValue: string | null;
    publicHosting: string;
    privateHosting: string;
    workflow: unknown;
  };
  roles: Array<{ roleKey: string; name: string; permissionsJson: string }>;
  sources: DataSource[];
  rules: ScreeningRule[];
  permissions: string[];
};

export type EvidenceMime = "application/pdf" | "image/jpeg" | "image/png";

export function isEvidenceMime(value: string): value is EvidenceMime {
  return value === "application/pdf" || value === "image/jpeg" || value === "image/png";
}

export type ApplicationView = {
  id: number;
  reference: string;
  stage: string;
  boreholeId: number | null;
  applicantId: number;
  updatedAt: Date;
  applicationType: string;
  completenessJson: string | null;
  decisionOutcome: string | null;
  decisionConditions: string | null;
  siteDetailsJson: string | null;
};

export type InspectionView = {
  id: number;
  reference: string;
  boreholeId: number;
  assignedTo: number;
  dueAt: Date | null;
  status: string;
  checklistJson: string;
  coordinatesConfirmed: boolean;
  observations: string | null;
  findings: string | null;
  recommendations: string | null;
  submittedAt: Date | null;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
};

export type FollowUpView = {
  id: number;
  inspectionId: number;
  boreholeId: number;
  title: string;
  ownerId: number;
  dueAt: Date | null;
  status: string;
};

export type InspectorUser = {
  id: number;
  name: string | null;
  email: string;
};

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  readAt: Date | null;
  createdAt: Date;
};

export type WorkspaceUser = {
  id: number;
  name: string | null;
  email: string;
  role: string;
  workspaceRoles: Array<{ roleKey: string; roleName: string }>;
};
