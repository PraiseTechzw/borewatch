import { useState } from "react";
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Shield,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { useAuth } from "@/_core/hooks/useAuth";

const PERMISSION_LABELS: Record<string, string> = {
  "*": "Full administrative access (*)",
  "record:view": "View borehole records",
  "record:create": "Create borehole records",
  "record:update": "Edit borehole records",
  "application:create": "Submit permit applications",
  "application:view_own": "View submitted applications",
  "application:review": "Review applications",
  "application:transition": "Execute workflow stage transitions",
  "inspection:view_assigned": "View assigned inspections",
  "inspection:submit": "Submit inspection findings",
  "screening:review": "Review GIS screening layers",
  "information:request": "Request additional information",
  "decision:record": "Record regulatory decisions",
  "layer:view": "Access spatial context layers",
  "layer:configure": "Configure data sources & layers",
  "workflow:configure": "Configure approval stages",
  "user:manage": "Manage roles & assignments",
  "audit:view": "View system audit logs",
  "report:view": "View summary compliance reports",
};

interface AccountDialogProps {
  auth: ReturnType<typeof useAuth>;
  permissions: string[];
  close: () => void;
  notify: (message: string) => void;
}

export default function AccountDialog({
  auth,
  permissions,
  close,
  notify,
}: AccountDialogProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Password changed successfully.");
    },
    onError: (err) => {
      setPasswordError(err.message || "Failed to update password");
      setPasswordSuccess(false);
    },
  });

  const isNewPasswordLongEnough = newPassword.length >= 12;
  const doNewPasswordsMatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const newPasswordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 12) {
      setPasswordError("New password must be at least 12 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password cannot be the same as your current password.");
      return;
    }

    await changePassword.mutateAsync({
      currentPassword,
      newPassword,
    });
  };

  const user = auth.user;
  if (!user) return null;

  const initials = (user.name || user.email || "BW")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isAdmin = user.role === "admin";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        className="dialog account-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
      >
        <div className="dialog-top">
          <div className="account-dialog-header">
            <span className="eyebrow">USER ACCOUNT</span>
            <h2 id="account-dialog-title">Account & Security</h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="account-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            className={`account-tab ${activeTab === "profile" ? "account-tab-active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User size={14} />
            <span>Profile & Permissions</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "security"}
            className={`account-tab ${activeTab === "security" ? "account-tab-active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <KeyRound size={14} />
            <span>Security & Password</span>
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="account-tab-content">
            {/* User Identity Card */}
            <div className="account-profile-card">
              <div className="account-avatar-large">{initials}</div>
              <div className="account-info">
                <h3>{user.name || "Unnamed Officer"}</h3>
                <span className="account-email">{user.email}</span>
                <div className="account-badges">
                  {isAdmin ? (
                    <span className="badge badge-amber">
                      <ShieldCheck size={12} className="inline mr-1" />
                      Platform Administrator
                    </span>
                  ) : (
                    <span className="badge badge-mint">
                      <Shield size={12} className="inline mr-1" />
                      Standard User
                    </span>
                  )}
                  <span className="badge badge-neutral">User ID #{user.id}</span>
                </div>
              </div>
            </div>

            {/* Session Security Banner */}
            <div className="account-session-card">
              <Lock size={15} className="account-session-icon" />
              <div>
                <b>Session Status: Active</b>
                <p>
                  Authenticated via secure, HTTP-only cookie session. Permissions are validated on each server request.
                </p>
              </div>
            </div>

            {/* Granted Workspace Permissions */}
            <div className="account-permissions-section">
              <div className="section-head">
                <span className="eyebrow">EFFECTIVE WORKSPACE PERMISSIONS</span>
                <h4>Granted Capabilities</h4>
              </div>

              {isAdmin ? (
                <div className="admin-privilege-notice">
                  <ShieldCheck size={16} />
                  <span>
                    As a <strong>Platform Administrator</strong>, your account has full wildcard (<code>*</code>) permissions across records, workflows, data layers, user roles, and audit trails.
                  </span>
                </div>
              ) : (
                <div className="permissions-chip-list">
                  {permissions.length > 0 ? (
                    permissions.map((perm) => (
                      <div key={perm} className="permission-chip-item">
                        <Check size={13} className="text-teal-700" />
                        <div>
                          <b>{PERMISSION_LABELS[perm] || perm}</b>
                          <code>{perm}</code>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-permissions">
                      <AlertCircle size={15} />
                      <span>No role-specific permissions assigned yet. Contact your system administrator to assign workspace roles.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sign Out Action */}
            <div className="account-dialog-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={close}
              >
                Close
              </button>
              <button
                type="button"
                className="button button-danger"
                onClick={async () => {
                  close();
                  await auth.logout();
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="account-tab-content">
            <div className="security-intro">
              <p>
                Update your account password. All passwords must be at least 12 characters and are securely encrypted using bcrypt.
              </p>
            </div>

            {passwordError && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={16} className="auth-error-icon" />
                <div className="auth-error-content">
                  <span>{passwordError}</span>
                </div>
              </div>
            )}

            {passwordSuccess && (
              <div className="auth-success-banner" role="status">
                <Check size={16} className="auth-success-icon" />
                <div>
                  <strong>Password changed successfully!</strong>
                  <p>Your new credentials will be required on your next sign in.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="change-password-form">
              <div className="auth-field-group">
                <label htmlFor="current-pw-input">Current password</label>
                <div className="input-with-action">
                  <input
                    id="current-pw-input"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    disabled={changePassword.isPending}
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-field-group">
                <div className="field-label-row">
                  <label htmlFor="new-pw-input">New password</label>
                  <span className="field-requirement">Minimum 12 characters</span>
                </div>
                <div className="input-with-action">
                  <input
                    id="new-pw-input"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new 12+ character password"
                    required
                    minLength={12}
                    disabled={changePassword.isPending}
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {newPassword.length > 0 && (
                  <div className="password-feedback">
                    <span
                      className={`validation-chip ${
                        isNewPasswordLongEnough
                          ? "validation-chip-valid"
                          : "validation-chip-pending"
                      }`}
                    >
                      {isNewPasswordLongEnough ? <Check size={12} /> : <Lock size={12} />}
                      {isNewPasswordLongEnough
                        ? "Minimum length requirement met (12+ characters)"
                        : `${newPassword.length}/12 characters minimum`}
                    </span>
                  </div>
                )}
              </div>

              <div className="auth-field-group">
                <label htmlFor="confirm-new-pw-input">Confirm new password</label>
                <div className="input-with-action">
                  <input
                    id="confirm-new-pw-input"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    minLength={12}
                    disabled={changePassword.isPending}
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <div className="password-feedback">
                    {doNewPasswordsMatch && (
                      <span className="validation-chip validation-chip-valid">
                        <Check size={12} /> Passwords match
                      </span>
                    )}
                    {newPasswordMismatch && (
                      <span className="validation-chip validation-chip-invalid">
                        <AlertCircle size={12} /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="account-dialog-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={close}
                  disabled={changePassword.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={
                    changePassword.isPending ||
                    !isNewPasswordLongEnough ||
                    !doNewPasswordsMatch ||
                    !currentPassword
                  }
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Updating password…</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
