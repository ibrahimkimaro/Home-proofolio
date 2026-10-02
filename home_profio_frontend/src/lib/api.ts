const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const message =
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail.map((e: { msg: string }) => e.msg).join(", ")
          : res.statusText;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export interface Profile {
  username: string;
  display_name: string;
  headline?: string | null;
  bio: string | null;
  avatar_url: string | null;
  visibility: "public" | "unlisted" | "private" | "draft";
  allow_indexing?: boolean;
}

export interface User {
  id: string;
  email: string;
  fullname?: string;
  username?: string;
  phone_number?: string | null;
  is_admin?: boolean;
  /** Signed up with a phone and hasn't entered the OTP yet. */
  otp_pending?: boolean;
  created_at: string;
  profile: Profile;
  preferences?: { appearance?: Record<string, string> };
}

export function registerUser(payload: {
  email: string;
  password: string;
  username: string;
  display_name?: string;
  fullname?: string;
  phone_number?: string;
}) {
  return request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
}

export function loginUser(payload: { email: string; password: string }) {
  return request<User>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

export function logoutUser() {
  return request<void>("/auth/logout", { method: "POST" });
}

export function fetchCurrentUser() {
  return request<User>("/auth/me");
}

export interface UsernameCheckResult {
  available: boolean;
  username: string;
  message: string;
  suggestions: string[];
}

export function checkUsernameAvailability(username: string): Promise<UsernameCheckResult> {
  return request<UsernameCheckResult>(`/auth/check-username?username=${encodeURIComponent(username)}`);
}

export interface OtpGenerateResponse {
  success: boolean;
  message: string;
  destination: string;
  channel: string;
  code: string;
  expires_in_seconds: number;
}

/** Activate a suspended account. 400 = wrong code, 410 = code expired or cancelled (ask for a new one). */
export function verifyAccount(code: string) {
  return request<User>("/auth/verify-account", { method: "POST", body: JSON.stringify({ code }) });
}

/** Where the member's activation code is. Never contains the code: an admin delivers it by hand. */
export interface ActivationStatus {
  channel: "phone" | "email";
  destination: string;
  /** An admin has delivered it; the 15-minute countdown runs from then. */
  sent: boolean;
  expires_in_seconds: number | null;
  resend_in_seconds: number;
}

/** The activation code waiting to be entered, or null if a new one is needed. */
export function getActivationStatus() {
  return request<ActivationStatus | null>("/auth/verify-account");
}

/** Ask for a new activation code by SMS or email; it replaces any earlier one. */
export function sendActivationCode(channel: "phone" | "email") {
  return request<ActivationStatus>("/auth/verify-account/send", { method: "POST", body: JSON.stringify({ channel }) });
}

export interface AdminStats {
  total_users: number;
  total_works: number;
  total_otps_sent: number;
  total_otps_verified: number;
  admin_count: number;
}

export interface AdminUser {
  id: string;
  email: string;
  fullname: string;
  username: string;
  phone_number: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  works_count: number;
}

export interface AdminOtpLog {
  id: string;
  destination: string;
  channel: string;
  code: string;
  purpose: string;
  is_verified: boolean;
  delivery_status: string;
  expires_at: string;
  created_at: string;
  verified_at: string | null;
}

export function fetchAdminStats() {
  return request<AdminStats>("/admin/stats");
}

export function fetchAdminUsers() {
  return request<AdminUser[]>("/admin/users");
}

export function fetchAdminOtps(limit = 50) {
  return request<AdminOtpLog[]>(`/admin/otps?limit=${limit}`);
}

export function updateAdminUser(id: string, payload: { is_active?: boolean; is_admin?: boolean }) {
  return request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteAdminUser(id: string) {
  return request<void>(`/admin/users/${id}`, { method: "DELETE" });
}

export interface AdminWork {
  id: string;
  title: string;
  work_type: string;
  status: WorkStatus;
  visibility: Visibility;
  skills: string[];
  owner_id: string;
  owner_username: string;
  owner_fullname: string;
  created_at: string;
  updated_at: string;
}

export function fetchAdminWorks() {
  return request<AdminWork[]>("/admin/works");
}

export function updateAdminWork(id: string, payload: { status?: WorkStatus; visibility?: Visibility }) {
  return request<AdminWork>(`/admin/works/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteAdminWork(id: string) {
  return request<void>(`/admin/works/${id}`, { method: "DELETE" });
}

/** Admin has texted or emailed this code; the member's 15 minutes start now. */
export function markOtpSent(id: string) {
  return request<AdminOtpLog>(`/admin/otps/${id}/sent`, { method: "POST" });
}

export function simulateAdminOtp(payload: { destination: string; channel?: string; purpose?: string }) {
  return request<OtpGenerateResponse>("/admin/otps/simulate", {
    method: "POST",
    body: JSON.stringify({
      destination: payload.destination,
      channel: payload.channel ?? "phone",
      purpose: payload.purpose ?? "admin_test",
    }),
  });
}

export type Visibility = "public" | "unlisted" | "private" | "draft";

/** Per-kind state; valid values live in lib/items.ts LIFECYCLES (mirrors the backend). */
export type WorkStatus = string;

export type EvidenceVisibility = "public" | "exists" | "private";

export interface EvidenceLink {
  label: string;
  url: string;
  type?: string;
  visibility?: EvidenceVisibility;
}

export interface Work {
  id: string;
  title: string;
  description: string | null;
  context_role: string | null;
  occurred_on: string | null;
  work_type: string;
  status: WorkStatus;
  template?: string | null;
  source_id?: string | null;
  visibility: Visibility;
  skills: string[];
  custom_attributes: Record<string, unknown>;
  evidence_links: EvidenceLink[];
  created_at: string;
  updated_at: string;
}

export interface WorkInput {
  title: string;
  description?: string | null;
  context_role?: string | null;
  occurred_on?: string | null;
  work_type: string;
  status: WorkStatus;
  template?: string | null;
  visibility: Visibility;
  skills: string[];
  custom_attributes: Record<string, unknown>;
  evidence_links: EvidenceLink[];
}

export function listWork() {
  return request<Work[]>("/works");
}

export function getWork(id: string) {
  return request<Work>(`/works/${id}`);
}

export function createWork(payload: WorkInput) {
  return request<Work>("/works", { method: "POST", body: JSON.stringify(payload) });
}

export function updateWork(id: string, payload: WorkInput) {
  return request<Work>(`/works/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteWork(id: string) {
  return request<void>(`/works/${id}`, { method: "DELETE" });
}

export interface UploadResult {
  url: string;
  name: string;
  content_type: string;
}

async function postFile<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  // No JSON Content-Type here: the browser sets the multipart boundary.
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body, credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, typeof err.detail === "string" ? err.detail : "Upload failed");
  }
  return res.json() as Promise<T>;
}

/** Backend returns "/uploads/..." paths; make them absolute for <img> and links. */
export function mediaUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith("/files/") ? `${API_URL}${path}` : path;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const data = await postFile<{ path: string; name: string; content_type: string }>("/uploads", file);
  // Store the canonical "/files/..." path; mediaUrl() makes it absolute when rendering.
  return { url: data.path, name: data.name, content_type: data.content_type };
}

export function updateProfile(payload: Partial<Pick<Profile, "display_name" | "headline" | "bio" | "username" | "visibility" | "allow_indexing">>) {
  return request<Profile>("/me/profile", { method: "PATCH", body: JSON.stringify(payload) });
}

export function uploadAvatar(file: File) {
  return postFile<Profile>("/me/avatar", file);
}

export function removeAvatar() {
  return request<Profile>("/me/avatar", { method: "DELETE" });
}

export type PortfolioSection = "about" | "experience" | "works" | "contact";

export interface PortfolioSettings {
  tagline: string | null;
  roles: string[];
  sections: PortfolioSection[];
  featured: string[];
  show_metrics: boolean;
  contact_email: string | null;
}

export const fetchPortfolio = () => request<PortfolioSettings>("/me/portfolio");
export const savePortfolio = (p: PortfolioSettings) =>
  request<PortfolioSettings>("/me/portfolio", { method: "PUT", body: JSON.stringify(p) });

export interface HomeData {
  counts: { items: number; proofs: number; public: number; days_active: number; followers: number };
  roles: string[];
  activity: { week: string; changes: number }[];
  portfolio: PortfolioSettings;
  keep_going: Work[];
  needs_proof: Work[];
  ready: Work[];
}

export function fetchHome() {
  return request<HomeData>("/me/home");
}

export interface PublicRole {
  title: string;
  organization: string | null;
  business_slug: string | null;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
  trust: "self_declared" | "confirmed";
}

export interface PublicProfile {
  username: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  skills: { name: string; works: number; proofs: number }[];
  roles: PublicRole[];
  followers: number;
  works: Work[];
  portfolio: PortfolioSettings;
  allow_indexing: boolean;
  /** Activated with a code sent to their phone or email. */
  verified?: boolean;
}

export interface PublicBusiness {
  slug: string;
  name: string;
  type: BusinessType;
  description: string | null;
  followers: number;
  offerings: Omit<Offering, "id">[] | null;
  team: { username: string; display_name: string; avatar_url: string | null; title: string; current: boolean; trust: string }[] | null;
  projects: { work: Work; author: { username: string; display_name: string } }[] | null;
  contact: Partial<Record<"phone" | "whatsapp" | "email" | "location", string>> | null;
}

export interface PublicWork {
  work: Work;
  owner: { username: string; display_name: string; avatar_url: string | null };
  source: Work | null;
}


export function turnIntoWork(id: string) {
  return request<Work>(`/works/${id}/turn-into-work`, { method: "POST" });
}

export interface TemplateField {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "number" | "list" | "select";
  options?: string[];
  placeholder?: string;
}

export interface WorkTemplate {
  key: string;
  kind: string;
  label: string;
  description: string | null;
  fields: TemplateField[];
}

let templatesCache: Promise<WorkTemplate[]> | null = null;
export function fetchTemplates() {
  templatesCache ??= request<WorkTemplate[]>("/templates").catch((e) => {
    templatesCache = null;
    throw e;
  });
  return templatesCache;
}

export interface TimelineEvent {
  work_id: string;
  title: string;
  kind: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  at: string;
}

export function fetchTimeline() {
  return request<TimelineEvent[]>("/works/timeline/me");
}

// ---------- roles & businesses ----------

export type BusinessType = "business" | "school" | "club" | "ngo" | "other";

export interface Role {
  id: string;
  title: string;
  organization_name: string | null;
  business: { slug: string; name: string; type: BusinessType } | null;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
  visibility: "public" | "private";
  trust: "self_declared" | "confirmed";
  hidden_by_business: boolean;
}

export interface RoleInput {
  title: string;
  business_slug?: string | null;
  organization_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  visibility: "public" | "private";
}

export const listMyRoles = () => request<Role[]>("/me/roles");
export const addRole = (p: RoleInput) => request<Role>("/me/roles", { method: "POST", body: JSON.stringify(p) });
export const updateRole = (id: string, p: RoleInput) => request<Role>(`/me/roles/${id}`, { method: "PUT", body: JSON.stringify(p) });
export const deleteRole = (id: string) => request<void>(`/me/roles/${id}`, { method: "DELETE" });

export interface Business {
  id: string;
  slug: string;
  name: string;
  type: BusinessType;
  description: string | null;
  visibility: Visibility;
  section_visibility: Partial<Record<BusinessSection, "public" | "private">>;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_email: boolean;
  show_location: boolean;
  my_permission: "owner" | "admin" | "editor" | null;
}

export type BusinessSection = "about" | "services" | "team" | "projects" | "contact";

export interface Offering {
  id: string;
  kind: "service" | "product";
  name: string;
  description: string | null;
  price: string | null;
}

export const listMyBusinesses = () => request<Business[]>("/businesses/mine");
export const createBusiness = (p: { name: string; type: BusinessType; description?: string | null }) =>
  request<Business>("/businesses", { method: "POST", body: JSON.stringify(p) });
export const getBusinessForEditing = (slug: string) => request<Business>(`/businesses/${slug}/manage`);
export const updateBusiness = (slug: string, p: Partial<Omit<Business, "id" | "slug" | "my_permission">>) =>
  request<Business>(`/businesses/${slug}`, { method: "PATCH", body: JSON.stringify(p) });
export const deleteBusiness = (slug: string) => request<void>(`/businesses/${slug}`, { method: "DELETE" });
export const listOfferings = (slug: string) => request<Offering[]>(`/businesses/${slug}/offerings`);
export const addOffering = (slug: string, p: Omit<Offering, "id">) =>
  request<Offering>(`/businesses/${slug}/offerings`, { method: "POST", body: JSON.stringify(p) });
export const deleteOffering = (slug: string, id: string) => request<void>(`/businesses/${slug}/offerings/${id}`, { method: "DELETE" });

export interface BusinessMemberRow {
  permission: "owner" | "admin" | "editor";
  username: string;
  display_name: string;
  avatar_url: string | null;
}
export const listMembers = (slug: string) => request<BusinessMemberRow[]>(`/businesses/${slug}/members`);
export const setMember = (slug: string, username: string, permission: BusinessMemberRow["permission"]) =>
  request<void>(`/businesses/${slug}/members`, { method: "PUT", body: JSON.stringify({ username, permission }) });
export const removeMember = (slug: string, username: string) => request<void>(`/businesses/${slug}/members/${username}`, { method: "DELETE" });

export interface BusinessRequests {
  roles: { id: string; title: string; username: string; display_name: string }[];
  works: { id: string; work_id: string; title: string; username: string; display_name: string }[];
}
export const listBusinessRequests = (slug: string) => request<BusinessRequests>(`/businesses/${slug}/requests`);
export const decideRole = (slug: string, roleId: string, d: "confirm" | "reject" | "hide" | "show") =>
  request<void>(`/businesses/${slug}/roles/${roleId}/${d}`, { method: "POST" });
export const decideWork = (slug: string, linkId: string, d: "accept" | "reject") =>
  request<void>(`/businesses/${slug}/works/${linkId}/${d}`, { method: "POST" });

export const linkWorkToBusiness = (workId: string, slug: string) =>
  request<{ status: string }>(`/works/${workId}/businesses/${slug}`, { method: "POST" });
export const listWorkBusinesses = (workId: string) =>
  request<{ status: string; slug: string; name: string }[]>(`/works/${workId}/businesses`);
export const unlinkWorkFromBusiness = (workId: string, slug: string) =>
  request<void>(`/works/${workId}/businesses/${slug}`, { method: "DELETE" });

// ---------- follow / watch / search ----------

export type SocialKind = "user" | "business" | "work";
export const socialStatus = (kind: SocialKind, key: string) =>
  request<{ active: boolean; signed_in: boolean; self?: boolean }>(`/social/${kind}/${encodeURIComponent(key)}`);
export const setSocial = (kind: SocialKind, key: string, on: boolean) =>
  request<void>(`/social/${kind}/${encodeURIComponent(key)}`, { method: on ? "PUT" : "DELETE" });

export interface SearchResults {
  people?: { username: string; display_name: string; headline: string | null; avatar_url: string | null }[];
  work?: {
    id: string;
    title: string;
    kind: string;
    status: string;
    skills: string[];
    proofs: number;
    owner: { username: string; display_name: string };
  }[];
  businesses?: { slug: string; name: string; type: BusinessType; description: string | null }[];
  skills?: { name: string; works: number }[];
}

export function search(q: string, type: "all" | "people" | "work" | "businesses" | "skills" = "all") {
  return request<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=${type}`);
}

// ---------- settings ----------

export interface Account {
  email: string;
  phone_number: string | null;
  created_at: string;
}

export const getAccount = () => request<Account>("/me/account");
export const updateAccount = (p: { email?: string; phone_number?: string | null; current_password?: string }) =>
  request<Account>("/me/account", { method: "PATCH", body: JSON.stringify(p) });
export const changePassword = (current_password: string, new_password: string) =>
  request<void>("/me/password", { method: "POST", body: JSON.stringify({ current_password, new_password }) });

export interface DeviceSession {
  id: string;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  current: boolean;
}

export const listSessions = () => request<DeviceSession[]>("/me/sessions");
export const signOutDevice = (id: string) => request<void>(`/me/sessions/${id}`, { method: "DELETE" });
export const signOutOtherDevices = () => request<void>("/me/sessions", { method: "DELETE" });

export interface AppNotification {
  id: string;
  kind: "follow" | "business" | "activated" | "signin" | "broadcast" | string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export const fetchNotifications = () => request<{ unread: number; items: AppNotification[] }>("/me/notifications");
/** Mark these notifications read, or all of them when no ids are given. */
export const markNotificationsRead = (ids?: string[]) =>
  request<void>("/me/notifications/read", { method: "POST", body: JSON.stringify({ ids: ids ?? null }) });
/** Same-origin link: the browser sends the session cookie and saves the file. */
export const exportDataUrl = () => `${API_URL}/me/export`;
export const deleteAccount = (password: string, confirm: string) =>
  request<void>("/me/delete", { method: "POST", body: JSON.stringify({ password, confirm }) });

export const saveAppearancePreference = (appearance: object) =>
  request<{ appearance?: object }>("/me/preferences", { method: "PUT", body: JSON.stringify({ appearance }) });

// ---------- onboarding (public) ----------

export type OnboardingStepKey = "discipline" | "work" | "evidence" | "questions" | "appearance" | "account";
export interface OnboardingStep {
  title: string;
  subtitle: string;
  enabled: boolean;
  phone_enabled?: boolean;
}
export interface OnboardingQuestion {
  id: string;
  prompt: string;
  help: string | null;
  kind: "single" | "multi" | "text";
  options: string[];
  required: boolean;
}
export interface OnboardingContent {
  steps: Partial<Record<OnboardingStepKey, OnboardingStep>>;
  registration: { open: boolean; closed_message: string };
  categories: { key: string; label: string }[];
  roles: {
    key: string;
    label: string;
    category_key: string;
    template: string;
    example_title: string;
    example_skills: string;
    evidence_hint: string;
  }[];
  questions: OnboardingQuestion[];
}

export const fetchOnboarding = () => request<OnboardingContent>("/onboarding");
export const saveOnboardingAnswers = (p: { discipline: string | null; answers: Record<string, string | string[]> }) =>
  request<void>("/me/onboarding", { method: "POST", body: JSON.stringify(p) });

export interface Announcement {
  active: boolean;
  text: string;
  tone: "info" | "success" | "warning";
  link: string | null;
}
export const fetchPlatform = () =>
  request<{ announcement: Announcement | null; registration: { open: boolean; closed_message: string } }>("/platform");

// ---------- admin: system management ----------

export interface AdminCategory {
  key: string;
  label: string;
  sort: number;
  active: boolean;
}
export interface AdminRole {
  key: string;
  label: string;
  category_key: string;
  template: string;
  example_title: string;
  example_skills: string;
  evidence_hint: string;
  sort: number;
  active: boolean;
  picked: number;
}
export interface AdminQuestion extends OnboardingQuestion {
  sort: number;
  active: boolean;
  answered: number;
}
export interface AdminOnboarding {
  steps: Partial<Record<OnboardingStepKey, OnboardingStep>>;
  categories: AdminCategory[];
  roles: AdminRole[];
  questions: AdminQuestion[];
  templates: { key: string; label: string }[];
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const adminOnboarding = () => request<AdminOnboarding>("/admin/onboarding");
export const adminSaveSteps = (steps: Record<OnboardingStepKey, OnboardingStep>) => request("/admin/onboarding/steps", json("PUT", steps));
export const adminAddCategory = (p: { key: string; label: string }) => request<AdminCategory>("/admin/onboarding/categories", json("POST", p));
export const adminEditCategory = (key: string, p: Partial<AdminCategory>) => request<AdminCategory>(`/admin/onboarding/categories/${key}`, json("PATCH", p));
export const adminDeleteCategory = (key: string) => request<void>(`/admin/onboarding/categories/${key}`, json("DELETE"));
export const adminAddRole = (p: Omit<AdminRole, "sort" | "picked" | "active">) => request<AdminRole>("/admin/onboarding/roles", json("POST", p));
export const adminEditRole = (key: string, p: Partial<AdminRole>) => request<AdminRole>(`/admin/onboarding/roles/${key}`, json("PATCH", p));
export const adminDeleteRole = (key: string) => request<void>(`/admin/onboarding/roles/${key}`, json("DELETE"));
export const adminAddQuestion = (p: Omit<OnboardingQuestion, "id">) => request<AdminQuestion>("/admin/onboarding/questions", json("POST", p));
export const adminEditQuestion = (id: string, p: Partial<AdminQuestion>) => request<AdminQuestion>(`/admin/onboarding/questions/${id}`, json("PATCH", p));
export const adminDeleteQuestion = (id: string) => request<void>(`/admin/onboarding/questions/${id}`, json("DELETE"));

export interface AdminTemplate extends WorkTemplate {
  sort: number;
  active: boolean;
  used: number;
}
export const adminTemplates = () => request<AdminTemplate[]>("/admin/templates");
export const adminAddTemplate = (p: { key: string; kind: string; label: string; description: string | null; fields: TemplateField[] }) =>
  request<AdminTemplate>("/admin/templates", json("POST", p));
export const adminEditTemplate = (key: string, p: Partial<Pick<AdminTemplate, "label" | "description" | "fields" | "active" | "sort">>) =>
  request<AdminTemplate>(`/admin/templates/${key}`, json("PATCH", p));
export const adminDeleteTemplate = (key: string) => request<void>(`/admin/templates/${key}`, json("DELETE"));

export interface AdminBusiness {
  id: string;
  slug: string;
  name: string;
  type: string;
  visibility: Visibility;
  owners: string[];
  followers: number;
  created_at: string;
}
export const adminBusinesses = () => request<AdminBusiness[]>("/admin/businesses");
export const adminSetBusinessVisibility = (slug: string, visibility: Visibility) => request(`/admin/businesses/${slug}`, json("PATCH", { visibility }));
export const adminDeleteBusiness = (slug: string) => request<void>(`/admin/businesses/${slug}`, json("DELETE"));

export interface AdminPlatform {
  registration: { open: boolean; closed_message: string };
  announcement: Announcement;
}
export const adminPlatform = () => request<AdminPlatform>("/admin/platform");
export const adminSaveRegistration = (p: AdminPlatform["registration"]) => request("/admin/platform/registration", json("PUT", p));
export const adminSaveAnnouncement = (p: Announcement) => request("/admin/platform/announcement", json("PUT", p));

export interface AuditEntry {
  id: string;
  admin: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  at: string;
}
export const adminAudit = (limit = 100) => request<AuditEntry[]>(`/admin/audit?limit=${limit}`);

export interface Point {
  date: string;
  value: number;
}
export interface Bar {
  label: string;
  value: number;
}
export interface AdminAnalytics {
  days: number;
  totals: Record<
    "users" | "new_users" | "new_users_prev" | "active_members" | "active_members_prev" | "works" | "public_works" | "proofs" | "businesses" | "follows" | "public_profiles",
    number
  >;
  series: Record<"signups" | "active_members" | "captures" | "shaped" | "published", Point[]>;
  funnel: { step: string; value: number }[];
  by_kind: Bar[];
  by_visibility: Bar[];
  top_skills: Bar[];
  disciplines: Bar[];
  questions: { id: string; prompt: string; active: boolean; responses: number; options: Bar[] }[];
}
export const adminAnalytics = (days = 30) => request<AdminAnalytics>(`/admin/analytics?days=${days}`);

// ---------- Admin: security monitoring, devices, system health, messages ----------

export interface SecurityAlert {
  rule: "brute_force" | "spraying" | "targeted" | "otp_guessing";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  ip: string | null;
  email: string | null;
  count: number;
  last_seen: string;
  blocked: boolean;
}

export interface SecurityOverview {
  hours: number;
  counts: Record<string, number>;
  active_sessions: number;
  alerts: SecurityAlert[];
  top_ips: { ip: string; failed: number; last_seen: string; blocked: boolean }[];
  timeline: { hour: string; ok: number; failed: number }[];
}

export interface SecurityEventRow {
  id: string;
  kind: string;
  ip: string | null;
  email: string | null;
  device: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface IpBlock {
  ip: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
  active: boolean;
}

export interface AdminDevice {
  id: string;
  user_id: string;
  username: string;
  email: string;
  name: string;
  is_admin: boolean;
  device: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  last_seen_at: string;
}

export const fetchSecurityOverview = (hours = 24) => request<SecurityOverview>(`/admin/security/overview?hours=${hours}`);
export const fetchSecurityEvents = (f: { kind?: string; ip?: string; email?: string } = {}) => {
  const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
  return request<SecurityEventRow[]>(`/admin/security/events?${q}`);
};
export const fetchIpBlocks = () => request<IpBlock[]>("/admin/security/blocks");
export const blockIp = (ip: string, reason: string, hours: number | null) =>
  request<{ ip: string }>("/admin/security/blocks", { method: "POST", body: JSON.stringify({ ip, reason, hours }) });
export const unblockIp = (ip: string) => request<void>(`/admin/security/blocks/${encodeURIComponent(ip)}`, { method: "DELETE" });

export const fetchAdminDevices = (q = "") => request<AdminDevice[]>(`/admin/sessions${q ? `?q=${encodeURIComponent(q)}` : ""}`);
export const endAdminSession = (id: string) => request<void>(`/admin/sessions/${id}`, { method: "DELETE" });
export const endUserSessions = (userId: string) => request<void>(`/admin/users/${userId}/sessions`, { method: "DELETE" });

export interface SystemHealth {
  status: "ok" | "degraded" | "down";
  issues: string[];
  checked_at: string;
  api: { uptime_s: number; python: string; pid: number };
  database: { ok: boolean; ping_ms: number | null; size_bytes: number | null; connections: number | null; version: string };
  storage: { uploads_bytes: number; disk_free_bytes: number; disk_total_bytes: number };
  traffic: TrafficStats;
  traffic_hour: TrafficStats;
  per_minute: { minute: number; requests: number; errors: number }[];
  recent_errors: { at: number; method: string; route: string; status: number; error: string | null }[];
  activity: {
    users?: number;
    works?: number;
    active_sessions?: number;
    online_15m?: number;
    signups_24h?: number;
    logins_24h?: number;
    hourly?: { hour: string; logins: number; signups: number }[];
  };
}

export interface TrafficStats {
  window_s: number;
  requests: number;
  per_minute: number;
  errors_5xx: number;
  errors_4xx: number;
  avg_ms: number;
  p95_ms: number;
  slowest: { route: string; avg_ms: number; count: number }[];
}

export const fetchSystemHealth = () => request<SystemHealth>("/admin/system/health");

export type BroadcastChannel = "in_app" | "sms" | "email";
export type BroadcastSegment = "all" | "active" | "unactivated";
export interface BroadcastContact {
  name: string;
  username: string;
  phone: string | null;
  email: string;
  to: string | null;
}
export interface BroadcastRow {
  id: string;
  channel: BroadcastChannel;
  segment: BroadcastSegment;
  subject: string;
  body: string;
  recipients: number;
  delivery: "delivered" | "manual" | "sent";
  sent_by: string | null;
  created_at: string;
}

export const previewBroadcast = (channel: BroadcastChannel, segment: BroadcastSegment) =>
  request<{ count: number; sample: BroadcastContact[] }>("/admin/broadcasts/preview", {
    method: "POST",
    body: JSON.stringify({ channel, segment }),
  });
export const sendBroadcast = (payload: { channel: BroadcastChannel; segment: BroadcastSegment; subject: string; body: string }) =>
  request<{ id: string; delivery: string; recipients: number; contacts: BroadcastContact[] }>("/admin/broadcasts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const fetchBroadcasts = () => request<BroadcastRow[]>("/admin/broadcasts");
export const fetchBroadcastContacts = (segment: BroadcastSegment, channel: BroadcastChannel) =>
  request<BroadcastContact[]>(`/admin/broadcasts/${segment}/${channel}/contacts`);

export interface ChatContactItem {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar: string | null;
  type: "direct";
  pairId: string;
  isOnline: boolean;
}

export const fetchChatContacts = () => request<ChatContactItem[]>("/chat/contacts");

// Signed identity for the realtime chat socket (expires in 1h; src/lib/realtime.ts refreshes it).
export const fetchChatToken = () => request<{ token: string }>("/chat/token");

// Live support: a member's DM with the support admin, and the admin's inbox of such threads.
export interface SupportAgent { id: string; name: string; topic: string }
export interface SupportThread { topic: string; user_id: string; name: string; username: string; last: string; last_at: string; unread: number; from_member: boolean }
export const fetchSupportAgent = () => request<SupportAgent>("/support/agent");
export const fetchSupportThreads = () => request<SupportThread[]>("/admin/support");
