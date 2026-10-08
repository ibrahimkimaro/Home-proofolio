const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

import {
  clearAllAuthStorage,
  getCachedUser,
  isUserCacheFresh,
  sanitizeUserForStorage,
  setCachedUser,
  updateCachedUser,
} from "./user-cache";

export {
  clearAllAuthStorage,
  getCachedUser,
  isUserCacheFresh,
  sanitizeUserForStorage,
  setCachedUser,
  updateCachedUser,
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Fewer API calls. Several components often ask for the same thing at the same moment (who am I, platform
// status, notifications): identical GETs in flight share one request, and a few lookups that rarely change are
// reused for a few seconds. Any write (POST/PUT/PATCH/DELETE) forgets what was kept, so nothing goes stale.
const inflight = new Map<string, Promise<unknown>>();
const recent = new Map<string, { at: number; value: unknown }>();
const REUSE_MS: Record<string, number> = { "/auth/me": 4_000, "/platform": 30_000, "/push/key": 300_000 };

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const plainGet = (options.method ?? "GET").toUpperCase() === "GET" && Object.keys(options).length === 0;
  if (!plainGet) {
    if ((options.method ?? "GET").toUpperCase() !== "GET") recent.clear();
    return send<T>(path, options);
  }
  const kept = recent.get(path);
  if (kept && Date.now() - kept.at < (REUSE_MS[path] ?? 0)) return Promise.resolve(kept.value as T);
  const pending = inflight.get(path);
  if (pending) return pending as Promise<T>;
  const p = send<T>(path, options)
    .then((value) => {
      if (REUSE_MS[path]) recent.set(path, { at: Date.now(), value });
      return value;
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

async function send<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    // Not activated in time: everything but support is closed. The suspended page explains and offers the code.
    if (res.status === 403 && message === "account_suspended" && typeof window !== "undefined" && window.location.pathname !== "/suspended") {
      window.location.assign("/suspended");
    }
    throw new ApiError(res.status, message === "account_suspended" ? "Your account is suspended. Activate it to continue." : message);
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
  /** Not activated within 15 minutes of the code: only support (and entering a code) works. */
  suspended?: boolean;
  activation_deadline?: string | null;
  created_at: string;
  profile: Profile;
  preferences?: { appearance?: Record<string, string> };
}

export async function registerUser(payload: {
  email: string;
  password: string;
  username: string;
  display_name?: string;
  fullname?: string;
  phone_number?: string;
}) {
  const user = await request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  setCachedUser(user);
  return user;
}

export async function loginUser(payload: { email: string; password: string }) {
  const user = await request<User>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  setCachedUser(user);
  return user;
}

export interface LogoutFeedbackPayload {
  rating?: number;
  feedback?: string;
}

/** Sign out. This device stops notifications and completely purges all cached profile and session state. */
export async function logoutUser(feedback?: LogoutFeedbackPayload) {
  try {
    await (await import("./push")).forgetThisDevice();
  } catch {}
  clearAllAuthStorage();
  return request<void>("/auth/logout", {
    method: "POST",
    body: feedback ? JSON.stringify(feedback) : undefined,
  });
}

/** Fetches current user, serving from secure client cache when fresh to eliminate redundant network hits. */
export async function fetchCurrentUser(options?: { force?: boolean }): Promise<User> {
  if (!options?.force && isUserCacheFresh()) {
    const cached = getCachedUser({ allowStale: false });
    if (cached) return cached;
  }
  try {
    const user = await request<User>("/auth/me");
    setCachedUser(user);
    return user;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      clearAllAuthStorage();
    }
    throw err;
  }
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
  /** emailed = went out by email; manual = waiting for an admin to send it. */
  delivery: "emailed" | "manual";
  /** The member this code is for, if the address or number belongs to exactly one. */
  user_name: string | null;
}

export interface OtpRecipient {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
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
  /** Seconds until the account is suspended (set once the first code has gone out). */
  suspends_in_seconds?: number | null;
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
  headline?: string | null;
  role?: string | null;
  roles?: string[];
}

export interface AdminOtpLog {
  id: string;
  destination: string;
  channel: string;
  code: string;
  purpose: string;
  is_verified: boolean;
  delivery_status: string;
  /** "email" = the system emailed it, "admin" = sent by hand, null = not sent yet. */
  sent_via: string | null;
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

export function updateAdminUser(
  id: string,
  payload: {
    is_active?: boolean;
    is_admin?: boolean;
    fullname?: string;
    headline?: string;
    role_title?: string;
  }
) {
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
export function resendOtpEmail(id: string) {
  return request<{ queued: boolean }>(`/admin/otps/${id}/email`, { method: "POST" });
}

export function markOtpSent(id: string) {
  return request<AdminOtpLog>(`/admin/otps/${id}/sent`, { method: "POST" });
}

/** A code an admin sent this member (2FA sign-in, password change...), still waiting to be entered. */
export interface MemberCode {
  id: string;
  purpose: string;
  label: string;
  channel: string;
  /** Masked: i•••@gmail.com or •••• 123. */
  destination: string;
  expires_in_seconds: number;
}
export const fetchMyCodes = () => request<MemberCode[]>("/me/codes");
export const verifyMyCode = (code: string) =>
  request<{ verified: boolean; purpose: string; label: string }>("/me/codes/verify", { method: "POST", body: JSON.stringify({ code }) });

// ---------- Web Push (backend app/api/push.py) ----------
export const fetchPushKey = () => request<{ enabled: boolean; public_key: string | null }>("/push/key");
export const subscribePush = (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
  request<void>("/me/push/subscribe", { method: "POST", body: JSON.stringify(sub) });
export const unsubscribePush = (endpoint: string) => request<void>("/me/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) });
export const sendTestPush = () => request<{ sent: number }>("/me/push/test", { method: "POST" });

export function sendAdminOtp(payload: { destination: string; channel: "email" | "phone"; purpose: string }) {
  return request<OtpGenerateResponse>("/admin/otps/send", { method: "POST", body: JSON.stringify(payload) });
}

export function searchOtpRecipients(q: string) {
  return request<OtpRecipient[]>(`/admin/otps/people?q=${encodeURIComponent(q)}`);
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

export async function updateProfile(payload: Partial<Pick<Profile, "display_name" | "headline" | "bio" | "username" | "visibility" | "allow_indexing">>) {
  const profile = await request<Profile>("/me/profile", { method: "PATCH", body: JSON.stringify(payload) });
  updateCachedUser((u) => ({
    ...u,
    fullname: profile.display_name || u.fullname,
    username: profile.username || u.username,
    profile: { ...u.profile, ...profile },
  }));
  return profile;
}

export async function uploadAvatar(file: File) {
  const profile = await postFile<Profile>("/me/avatar", file);
  updateCachedUser((u) => ({
    ...u,
    profile: { ...u.profile, ...profile },
  }));
  return profile;
}

export async function removeAvatar() {
  const profile = await request<Profile>("/me/avatar", { method: "DELETE" });
  updateCachedUser((u) => ({
    ...u,
    profile: { ...u.profile, ...profile },
  }));
  return profile;
}

export type PortfolioSection = "about" | "experience" | "works" | "contact";

export interface PortfolioSettings {
  tagline: string | null;
  roles: string[];
  sections: PortfolioSection[];
  featured: string[];
  show_metrics: boolean;
  contact_email: string | null;
  /** More emails, phone numbers and WhatsApp numbers shown on the portfolio. */
  contacts: ContactItem[];
  /** Social profiles (just the handle; the link is built from the platform). */
  socials: SocialLink[];
}

export interface ContactItem {
  kind: "email" | "phone" | "whatsapp";
  value: string;
  label: string | null;
}
export interface SocialLink {
  platform: "instagram" | "tiktok" | "github" | "facebook" | "snapchat" | "threads" | "x" | "telegram" | "linkedin";
  handle: string;
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
  discussions?: {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    created_at: string;
    replies: number;
    upvotes: number;
    author: { name: string; username: string; avatar: string | null };
  }[];
}

export function search(q: string, type: "all" | "people" | "work" | "businesses" | "skills" | "discussions" = "all") {
  return request<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=${type}`);
}

// ---------- discussions ----------

export interface DiscussionThreadItem {
  id: string;
  title: string;
  content: string;
  category: "tech" | "design" | "health" | "sports" | "general";
  categoryLabel: string;
  accessType: "open" | "invited";
  invitedUsers?: string[];
  author: {
    id?: string;
    username?: string;
    name: string;
    role: string;
    avatar?: string | null;
  };
  upvotes: number;
  replies: number;
  hasVoted?: boolean;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  repliesList?: {
    id: string;
    text: string;
    author: string;
    role: string;
    avatar?: string | null;
    username?: string;
    userId?: string;
    time: string;
  }[];
}

export interface CreateDiscussionInput {
  title: string;
  content: string;
  category: "tech" | "design" | "health" | "sports" | "general";
  access_type: "open" | "invited";
  invited_users?: string[];
  tags?: string[];
}

export function fetchDiscussions(params?: { category?: string; access_type?: string; search?: string }) {
  const sp = new URLSearchParams();
  if (params?.category && params.category !== "all") sp.set("category", params.category);
  if (params?.access_type && params.access_type !== "all") sp.set("access_type", params.access_type);
  if (params?.search) sp.set("search", params.search);
  const q = sp.toString();
  return request<DiscussionThreadItem[]>(`/discussions${q ? `?${q}` : ""}`);
}

export function fetchDiscussion(id: string) {
  return request<DiscussionThreadItem>(`/discussions/${id}`);
}

export function createDiscussion(input: CreateDiscussionInput) {
  return request<DiscussionThreadItem>("/discussions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function postDiscussionReply(discussionId: string, content: string) {
  return request<{
    id: string;
    text: string;
    author: string;
    role: string;
    avatar?: string | null;
    username?: string;
    userId?: string;
    time: string;
  }>(`/discussions/${discussionId}/replies`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function toggleDiscussionVote(discussionId: string) {
  return request<{ upvotes: number; hasVoted: boolean }>(`/discussions/${discussionId}/vote`, {
    method: "POST",
  });
}

export function deleteDiscussion(discussionId: string) {
  return request<void>(`/discussions/${discussionId}`, { method: "DELETE" });
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

// Settings > Privacy. show_phone_in_chat: people you chat with see your phone in Contact info (off by default).
export interface PrivacyPrefs {
  show_phone_in_chat: boolean;
}
export const fetchPrivacyPreference = () =>
  request<{ privacy?: PrivacyPrefs | null }>("/me/preferences").then((p) => p.privacy ?? { show_phone_in_chat: false });
export const savePrivacyPreference = (privacy: PrivacyPrefs) =>
  request<{ privacy?: PrivacyPrefs }>("/me/preferences", { method: "PUT", body: JSON.stringify({ privacy }) });

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
export type BroadcastSegment = "all" | "active" | "unactivated" | "selected";
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
  /** delivered = in-app; sending/sent/partial/failed = email sent by the server; manual = SMS or email sent by hand. */
  delivery: "delivered" | "manual" | "sending" | "sent" | "partial" | "failed";
  sent_by: string | null;
  created_at: string;
  /** In-app messages are tracked per person; SMS and email are sent by hand and can't be. */
  tracked: boolean;
  delivered_count: number;
  read_count: number;
  /** Emails that couldn't be delivered. */
  failed: number;
}
export interface BroadcastPerson {
  id: string;
  name: string;
  username: string;
  status: "sent" | "delivered" | "read";
  delivered_at: string | null;
  read_at: string | null;
}
export interface BroadcastReport {
  tracked: boolean;
  channel: BroadcastChannel;
  total?: number;
  delivered?: number;
  read?: number;
  recipients: BroadcastPerson[];
}
export interface MemberPick {
  id: string;
  name: string;
  username: string;
  email: string;
}

export const previewBroadcast = (channel: BroadcastChannel, segment: BroadcastSegment, userIds: string[] = []) =>
  request<{ count: number; sample: BroadcastContact[] }>("/admin/broadcasts/preview", {
    method: "POST",
    body: JSON.stringify({ channel, segment, user_ids: userIds }),
  });
export const sendBroadcast = (payload: { channel: BroadcastChannel; segment: BroadcastSegment; subject: string; body: string; user_ids?: string[] }) =>
  request<{ id: string; delivery: string; recipients: number; contacts: BroadcastContact[] }>("/admin/broadcasts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const fetchBroadcasts = () => request<BroadcastRow[]>("/admin/broadcasts");
export const fetchBroadcastCapabilities = () => request<{ email: boolean }>("/admin/broadcasts/capabilities");
export const fetchBroadcastContacts = (id: string) => request<BroadcastContact[]>(`/admin/broadcasts/${id}/contacts`);
export const fetchBroadcastReport = (id: string) => request<BroadcastReport>(`/admin/broadcasts/${id}/report`);
export const searchMembers = (q: string) => request<MemberPick[]>(`/admin/broadcasts/people?q=${encodeURIComponent(q)}`);

export interface ChatContactItem {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar: string | null;
  type: "direct";
  pairId: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export const fetchChatContacts = (search?: string) =>
  request<ChatContactItem[]>(search ? `/chat/contacts?search=${encodeURIComponent(search)}` : "/chat/contacts");

export const searchChatMembers = (query: string = "") =>
  request<ChatContactItem[]>(`/chat/search-members?q=${encodeURIComponent(query)}`);

// Group chats: the creator is admin; invited members accept or decline from their notifications.
export interface ChatGroupItem {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar: string | null;
  type: "group";
  roomId: string;
  myRole: "admin" | "member";
  membersCount: number;
  isOnline: boolean;
  lastMessage: string | null;
  lastMessageTime: string | null;
  invited?: number;
}
export interface GroupMember {
  user_id: string;
  name: string;
  username: string;
  role: "admin" | "member";
  status: "member" | "invited";
  is_me: boolean;
  avatar?: string | null;
}
export interface GroupDetail {
  id: string;
  name: string;
  topic: string;
  slug: string;
  avatar: string | null;
  my_role: "admin" | "member";
  my_status: "member" | "invited";
  members: GroupMember[];
}

export const fetchChatGroups = () => request<ChatGroupItem[]>("/chat/groups");
export const createChatGroup = (name: string, topic: string, memberIds: string[]) =>
  request<ChatGroupItem>("/chat/groups", { method: "POST", body: JSON.stringify({ name, topic, member_ids: memberIds }) });
export const fetchGroupDetail = (id: string) => request<GroupDetail>(`/chat/groups/${id}`);
// Group admins: rename, description, picture, delete the whole group.
export const editChatGroup = (id: string, changes: { name?: string; topic?: string }) =>
  request<ChatGroupItem>(`/chat/groups/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
export const uploadGroupAvatar = (id: string, file: File) => postFile<ChatGroupItem>(`/chat/groups/${id}/avatar`, file);
export const removeGroupAvatar = (id: string) => request<ChatGroupItem>(`/chat/groups/${id}/avatar`, { method: "DELETE" });
export const deleteChatGroup = (id: string) => request<void>(`/chat/groups/${id}`, { method: "DELETE" });
/** A message I pinned in a chat (pins are personal: the other people don't see them). */
export interface ChatPinItem {
  message_id: number;
  author_name: string;
  text: string;
  has_file: boolean;
  deleted: boolean;
}
export const fetchPins = (topic: string) => request<ChatPinItem[]>(`/chat/pins?topic=${encodeURIComponent(topic)}`);
export const pinMessage = (topic: string, messageId: number) =>
  request<void>("/chat/pins", { method: "POST", body: JSON.stringify({ topic, message_id: messageId }) });
export const unpinMessage = (topic: string, messageId: number) =>
  request<void>(`/chat/pins?topic=${encodeURIComponent(topic)}&message_id=${messageId}`, { method: "DELETE" });
/** "Delete chat": clears this conversation for me only (1:1 or group); the others keep theirs. */
export const clearChat = (topic: string) => request<void>("/chat/clear", { method: "POST", body: JSON.stringify({ topic }) });
export const acceptGroupInvite = (id: string) =>
  request<{ slug: string; topic: string; group: ChatGroupItem }>(`/chat/groups/${id}/accept`, { method: "POST" });
export const declineGroupInvite = (id: string) => request<void>(`/chat/groups/${id}/decline`, { method: "POST" });
export const addGroupMembers = (id: string, userIds: string[]) =>
  request<{ invited: number }>(`/chat/groups/${id}/members`, { method: "POST", body: JSON.stringify({ user_ids: userIds }) });
export const removeGroupMember = (id: string, userId: string) =>
  request<void>(`/chat/groups/${id}/members/${userId}`, { method: "DELETE" });
export const setGroupMemberRole = (id: string, userId: string, role: "admin" | "member") =>
  request<void>(`/chat/groups/${id}/members/${userId}/role`, { method: "POST", body: JSON.stringify({ role }) });

// Chat attachments: upload first (owned by the sender), then send a message naming it. Downloads
// are allowed to the people of the chats it was sent in (backend app/api/chat_files.py).
export interface ChatAttachment {
  name: string;
  filename: string;
  content_type: string;
  size: number | null;
}

/** Upload with progress (0..1). XHR rather than fetch: fetch can't report upload progress. */
export function uploadChatAttachment(file: File, onProgress?: (fraction: number) => void): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/chat/attachments`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let body: { detail?: unknown } & Partial<ChatAttachment> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as ChatAttachment);
      else reject(new ApiError(xhr.status, typeof body.detail === "string" ? body.detail : "Upload failed"));
    };
    xhr.onerror = () => reject(new ApiError(0, "Upload failed: check your connection"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export const chatAttachmentUrl = (name: string, download = false) =>
  `${API_URL}/chat/attachments/${encodeURIComponent(name)}${download ? "?download=1" : ""}`;

export interface SharedFile extends ChatAttachment {
  message_id: string;
  mine: boolean;
  author_name: string;
  sent_at: string;
}

/** The details panel of a 1:1 chat. `phone` is set only when they chose to show it in chat. */
export interface ContactInfo {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  headline: string | null;
  bio: string | null;
  phone: string | null;
  joined_at: string | null;
  topic: string;
  files: SharedFile[];
}
export const fetchContactInfo = (userId: string) => request<ContactInfo>(`/chat/contacts/${userId}/info`);

// Signed identity for the realtime chat socket (expires in 1h; src/lib/realtime.ts refreshes it).
export const fetchChatToken = () => request<{ token: string }>("/chat/token");

// Live support: a member or guest's DM with the support admin, and the admin's inbox of such threads.
export interface SupportAgent { id: string; name: string; topic: string }
export interface SupportThread {
  topic: string;
  user_id: string;
  name: string;
  username: string;
  last: string;
  last_at: string;
  unread: number;
  from_member: boolean;
  is_guest?: boolean;
}
export const fetchSupportAgent = () => request<SupportAgent>("/support/agent");
export const fetchSupportThreads = () => request<SupportThread[]>("/admin/support");

export interface GuestSupportResponse {
  guest_id: string;
  session_id: string;
  name: string;
  /** What to call them: the name they gave (null if none). */
  display_name: string | null;
  handle: string;
  returning: boolean;
  visits: number;
  last_visit: string | null;
  username: string;
  token: string;
  agent: SupportAgent;
}

export const initGuestSupport = (sessionId: string, displayName?: string, email?: string) =>
  request<GuestSupportResponse>("/support/guest/init", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, display_name: displayName || undefined, email: email || undefined }),
  });

// ---------- Curriculum Vitae (backend app/api/cv.py) ----------
// profile/roles/skills are live from Proofolio; `data` is what only the CV has. Valid once signed.

export interface CvLink { label: string; url: string }
export interface CvReferee { id: string; name: string; title: string; organization: string; phone: string; email: string }
export interface CvEntry { id: string; title: string; organization: string; place: string; start: string; end: string; points: string[] }
export interface CvLevel { name: string; level: number }
export interface CvData {
  name: string;
  title: string;
  about: string;
  address: string;
  show_phone: boolean;
  show_email: boolean;
  links: CvLink[];
  referees: CvReferee[];
  education: CvEntry[];
  jobs: CvEntry[];
  role_points: Record<string, string[]>;
  hidden_roles: string[];
  skills: CvLevel[];
  hidden_skills: string[];
  languages: CvLevel[];
  hobbies: string[];
}
export interface CvRole { id: string; title: string; organization: string; start: string | null; end: string | null }
export interface Cv {
  profile: { name: string; title: string; about: string; photo: string | null; email: string; phone: string; username: string };
  roles: CvRole[];
  skills: (CvLevel & { count: number })[];
  data: CvData;
  signature: string | null;
  signed_at: string | null;
  updated_at: string | null;
  share_token?: string | null;
}

export const fetchMyCv = () => request<Cv>("/me/cv");
export const saveMyCv = (data: CvData) => request<Cv>("/me/cv", { method: "PUT", body: JSON.stringify(data) });
export const signMyCv = (dataUrl: string) =>
  request<{ signed_at: string }>("/me/cv/signature", { method: "PUT", body: JSON.stringify({ data_url: dataUrl }) });
export const removeCvSignature = () => request<void>("/me/cv/signature", { method: "DELETE" });
export const shareMyCv = () => request<{ share_token: string }>("/me/cv/share", { method: "POST" });
export const stopSharingCv = () => request<void>("/me/cv/share", { method: "DELETE" });
export const fetchSharedCv = (token: string) => request<Cv>(`/cv/shared/${encodeURIComponent(token)}`);

/** Admin: remove one code from the list. */
export const deleteAdminOtp = (id: string) => request<void>(`/admin/otps/${id}`, { method: "DELETE" });
/** Admin: empty the list ("finished" = used and expired codes only). */
export const clearAdminOtps = (scope: "finished" | "all") => request<{ removed: number }>(`/admin/otps/clear?scope=${scope}`, { method: "POST" });

// ---- engagement: stars, comments, CV requests, visitor messages ----

export type EngageKind = "profile" | "work";
export interface EngagePerson {
  name: string;
  username: string | null;
  avatar: string | null;
}
export interface EngageComment {
  id: string;
  body: string;
  created_at: string;
  author: EngagePerson;
  mine: boolean;
  can_delete: boolean;
}
export interface EngageStatus {
  likes: number;
  /** Who starred it (the latest 24). */
  stars: EngagePerson[];
  liked: boolean;
  signed_in: boolean;
  self: boolean;
  comment_count: number;
  comments: EngageComment[];
}
export const engageStatus = (kind: EngageKind, key: string) => request<EngageStatus>(`/engage/${kind}/${encodeURIComponent(key)}`);
export const setLike = (kind: EngageKind, key: string, on: boolean) =>
  request<void>(`/engage/${kind}/${encodeURIComponent(key)}/like`, { method: on ? "PUT" : "DELETE" });
export const addComment = (kind: EngageKind, key: string, body: string) =>
  request<EngageComment>(`/engage/${kind}/${encodeURIComponent(key)}/comments`, { method: "POST", body: JSON.stringify({ body }) });
export const deleteComment = (id: string) => request<void>(`/engage/comments/${id}`, { method: "DELETE" });

export interface AskPayload {
  name?: string;
  email?: string;
  message?: string;
  website?: string;
}
export const askForCv = (username: string, payload: AskPayload) =>
  request<{ ok: boolean }>(`/u/${encodeURIComponent(username)}/cv-request`, { method: "POST", body: JSON.stringify(payload) });
export const leaveVisitorMessage = (username: string, payload: AskPayload) =>
  request<{ ok: boolean }>(`/u/${encodeURIComponent(username)}/message`, { method: "POST", body: JSON.stringify(payload) });

export interface CvRequestItem {
  id: string;
  name: string;
  email: string | null;
  message: string | null;
  status: "pending" | "sent" | "declined";
  created_at: string;
  member_username: string | null;
  cv_ready: boolean;
}
export const fetchCvRequests = () => request<CvRequestItem[]>("/me/cv-requests");
export const sendCvRequest = (id: string) => request<{ status: string; link: string; emailed: boolean | null }>(`/me/cv-requests/${id}/send`, { method: "POST" });
export const declineCvRequest = (id: string) => request<{ status: string }>(`/me/cv-requests/${id}/decline`, { method: "POST" });
export const deleteCvRequest = (id: string) => request<void>(`/me/cv-requests/${id}`, { method: "DELETE" });

export interface VisitorMessageItem {
  id: string;
  name: string;
  email: string | null;
  body: string;
  created_at: string;
  read: boolean;
}
export const fetchVisitorMessages = () => request<VisitorMessageItem[]>("/me/visitor-messages");
export const readVisitorMessage = (id: string) => request<void>(`/me/visitor-messages/${id}/read`, { method: "POST" });
export const deleteVisitorMessage = (id: string) => request<void>(`/me/visitor-messages/${id}`, { method: "DELETE" });

export interface EngagedPerson extends EngagePerson {
  at: string;
}
export interface EngagedComment extends EngagePerson {
  id: string;
  body: string;
  at: string;
}
export interface Engagement {
  totals: {
    followers: number;
    profile_likes: number;
    profile_comments: number;
    work_likes: number;
    work_comments: number;
    watchers: number;
    cv_pending: number;
    messages_unread: number;
  };
  profile: { likes: EngagedPerson[]; comments: EngagedComment[] };
  followers: EngagedPerson[];
  works: {
    id: string;
    title: string;
    work_type: string;
    visibility: string;
    likes: EngagedPerson[];
    like_count: number;
    comments: EngagedComment[];
    comment_count: number;
    watchers: EngagedPerson[];
    watcher_count: number;
  }[];
}
export const fetchEngagement = () => request<Engagement>("/me/engagement");

// ---------- AI: admin dashboards and the website's support assistant ----------

/** One chart of an AI-built dashboard. The numbers always come from the database, never from the model. */
export type AiWidget =
  | { type: "kpis"; title: string; items: { label: string; value: number; prev?: number; hint?: string }[] }
  | { type: "columns"; title: string; total: number; points: Point[]; mode: "sum" | "avg" }
  | { type: "bars"; title: string; bars: Bar[]; empty?: string; view?: "bars" | "pie" | "donut" }
  | { type: "funnel"; title: string; steps: { step: string; value: number }[] };

export interface AiDashboard {
  /** The model's short summary of what the charts show. */
  reply: string;
  widgets: AiWidget[];
  /** A PDF the assistant made: show a download button. url is an API path, see apiUrl(). */
  download?: { name: string; label: string; url: string } | null;
  seconds: number;
}

/** Full URL of an API path, for links the browser opens itself (downloads). */
export const apiUrl = (path: string) => `${API_URL}${path}`;

/** build = a dashboard of charts, chat = plain conversation, prepare = a written piece (report, story, announcement). */
export type AdminAiMode = "build" | "chat" | "prepare";

/** Admin: ask in plain words, get a reply and charts. history: earlier "User: ..." / "Assistant: ..." lines, oldest first. */
export const adminAiDashboard = (prompt: string, history: string[] = [], mode: AdminAiMode = "build") =>
  request<AiDashboard>("/ai/admin/dashboard", json("POST", { prompt, history, mode }));

/** Public website: one turn with the AI support assistant. No account needed; it sees no user data. */
export const askSupportAi = (message: string, history: string[] = [], name?: string | null) =>
  request<{ reply: string }>("/ai/support", {
    method: "POST",
    body: JSON.stringify({ message, history, name: name || null }),
  });

// ---------- Memories & Personal Timeline ----------

export interface MemoryItem {
  id: string;
  title: string | null;
  content: string;
  mood: string;
  people: string[];
  category: string;
  location?: string | null;
  skills?: string[];
  tags?: string[];
  importance?: number;
  occurred_on: string;
  occurred_time?: string | null;
  visibility: "public" | "unlisted" | "private" | "draft";
  created_at: string;
  updated_at?: string;
}

export interface CreateMemoryPayload {
  title?: string | null;
  content: string;
  mood: string;
  people: string[];
  category?: string;
  location?: string | null;
  tags?: string[];
  importance?: number;
  occurred_on?: string | null;
  visibility?: "public" | "unlisted" | "private" | "draft";
}

export const fetchMemories = (params?: { q?: string; category?: string; mood?: string; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.category) query.set("category", params.category);
  if (params?.mood) query.set("mood", params.mood);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return request<MemoryItem[]>(`/memories${qs ? `?${qs}` : ""}`);
};

export const fetchMemory = (id: string) => request<MemoryItem>(`/memories/${id}`);

export const createMemory = (payload: CreateMemoryPayload) =>
  request<MemoryItem>("/memories", { method: "POST", body: JSON.stringify(payload) });

export const updateMemory = (id: string, payload: Partial<CreateMemoryPayload>) =>
  request<MemoryItem>(`/memories/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteMemory = (id: string) =>
  request<void>(`/memories/${id}`, { method: "DELETE" });

// ---------- Stories & Narrated Journeys ----------

export interface StoryChapterItem {
  id: string;
  position: number;
  title: string;
  content: string;
  memory_ids: string[];
  ai_generated?: boolean;
}

export interface StoryItem {
  id: string;
  title: string;
  description?: string | null;
  cover_media?: string | null;
  status: "draft" | "published";
  visibility: "public" | "unlisted" | "private" | "draft";
  created_at: string;
  updated_at?: string;
  chapters?: StoryChapterItem[];
}

export interface CreateStoryPayload {
  title: string;
  description?: string | null;
  visibility?: "public" | "unlisted" | "private" | "draft";
  status?: "draft" | "published";
}

export const fetchStories = () => request<StoryItem[]>("/stories");

export const fetchStory = (id: string) => request<StoryItem>(`/stories/${id}`);

export const createStory = (payload: CreateStoryPayload) =>
  request<StoryItem>("/stories", { method: "POST", body: JSON.stringify(payload) });

export const updateStory = (id: string, payload: Partial<CreateStoryPayload>) =>
  request<StoryItem>(`/stories/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteStory = (id: string) =>
  request<void>(`/stories/${id}`, { method: "DELETE" });

export const generateStoryWithAi = (topic: string) =>
  request<StoryItem>("/stories/generate", { method: "POST", body: JSON.stringify({ topic }) });

export const addStoryChapter = (storyId: string, payload: { title: string; content?: string }) =>
  request<StoryChapterItem>(`/stories/${storyId}/chapters`, { method: "POST", body: JSON.stringify(payload) });

export const updateStoryChapter = (storyId: string, chapterId: string, payload: { title?: string; content?: string }) =>
  request<StoryChapterItem>(`/stories/${storyId}/chapters/${chapterId}`, { method: "PATCH", body: JSON.stringify(payload) });

export const deleteStoryChapter = (storyId: string, chapterId: string) =>
  request<void>(`/stories/${storyId}/chapters/${chapterId}`, { method: "DELETE" });

