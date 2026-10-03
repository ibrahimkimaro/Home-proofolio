"use client";

import { useId, useState, type ReactNode } from "react";
import { mediaUrl, type Cv, type CvEntry, type CvLevel } from "@/lib/api";

/**
 * The CV in the Proofolio format: a dark sidebar (photo, about, links, referees, hobbies) and a
 * white page (name, contact, work experience and education timelines, skills and languages, signed
 * declaration). Monochrome, no icons; the Tanzania flag is a faint watermark behind the white page
 * and the national coat of arms (public/images/cv/coat-of-arms.png, if present) sits small in the
 * top-right corner. Sized in real A4 millimetres so printing / "Save as PDF" matches the preview.
 */

export const CV_WIDTH_MM = 210;
export const EMBLEM_SRC = "/images/cv/coat-of-arms.png";

export interface CvView {
  name: string;
  title: string;
  about: string;
  address: string;
  phone: string;
  email: string;
  photo: string | null;
  links: { label: string; url: string }[];
  referees: Cv["data"]["referees"];
  hobbies: string[];
  experience: (Omit<CvEntry, "id"> & { key: string })[];
  education: CvEntry[];
  skills: CvLevel[];
  languages: CvLevel[];
  signature: string | null;
  signedAt: string | null;
}

const month = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";

/** Live Proofolio data + the member's CV extras and overrides -> what the page shows. */
export function composeCv(cv: Cv): CvView {
  const d = cv.data;
  const hiddenSkills = new Set(d.hidden_skills.map((s) => s.toLowerCase()));
  const rated = new Map(d.skills.map((s) => [s.name.toLowerCase(), s]));
  const skills: CvLevel[] = [
    ...cv.skills
      .filter((s) => !hiddenSkills.has(s.name.toLowerCase()))
      .map((s) => rated.get(s.name.toLowerCase()) ?? { name: s.name, level: s.level }),
    ...d.skills.filter((s) => !cv.skills.some((l) => l.name.toLowerCase() === s.name.toLowerCase())),
  ];
  return {
    name: d.name || cv.profile.name,
    title: d.title || cv.profile.title,
    about: d.about || cv.profile.about,
    address: d.address,
    phone: d.show_phone ? cv.profile.phone : "",
    email: d.show_email ? cv.profile.email : "",
    photo: cv.profile.photo,
    links: d.links.filter((l) => l.url),
    referees: d.referees.filter((r) => r.name),
    hobbies: d.hobbies.filter(Boolean),
    experience: [
      ...cv.roles
        .filter((r) => !d.hidden_roles.includes(r.id))
        .map((r) => ({
          key: r.id,
          title: r.title,
          organization: r.organization,
          place: "",
          start: month(r.start),
          end: r.end ? month(r.end) : r.start ? "Present" : "",
          points: d.role_points[r.id] ?? [],
        })),
      ...d.jobs.map(({ id, ...j }) => ({ key: id, ...j })),
    ],
    education: d.education,
    skills,
    languages: d.languages,
    signature: cv.signature,
    signedAt: cv.signed_at,
  };
}

export function CvDocument({ cv, id }: { cv: CvView; id?: string }) {
  const [emblem, setEmblem] = useState(true);
  const [first, ...rest] = cv.name.trim().split(/\s+/);
  const photo = mediaUrl(cv.photo);

  return (
    <article
      id={id}
      className="cv-page relative grid grid-cols-[72mm_1fr] bg-white text-[#2b2b2b] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
      style={{ width: `${CV_WIDTH_MM}mm`, minHeight: "297mm", fontSize: "8.4pt", lineHeight: 1.45 }}
    >
      {/* ---------- sidebar ---------- */}
      <aside className="bg-[#414448] px-[7mm] pb-[10mm] pt-[9mm] text-[#e9e9e9]">
        <div className="mb-[8mm] flex justify-center">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- printed as-is; signed private URL
            <img src={photo} alt="" className="h-[40mm] w-[40mm] rounded-full border-[1.2mm] border-white/90 object-cover" />
          ) : (
            <div className="flex h-[40mm] w-[40mm] items-center justify-center rounded-full border-[1.2mm] border-white/90 bg-[#5a5d61] text-[22pt] font-bold tracking-wide">
              {initials(cv.name)}
            </div>
          )}
        </div>

        {cv.about && (
          <SideSection title="About me">
            <p className="whitespace-pre-line">{cv.about}</p>
          </SideSection>
        )}

        {cv.links.length > 0 && (
          <SideSection title="Links">
            <ul className="space-y-[2.5mm]">
              {cv.links.map((l, i) => (
                <li key={i}>
                  <p className="font-bold text-white">{l.label}:</p>
                  <a href={l.url} className="break-all underline underline-offset-2">
                    {l.url.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </SideSection>
        )}

        {cv.referees.length > 0 && (
          <SideSection title={cv.referees.length > 1 ? "References" : "Reference"}>
            <ul className="space-y-[4mm]">
              {cv.referees.map((r) => (
                <li key={r.id}>
                  <p className="text-[10.5pt] uppercase tracking-wide text-white">{r.name}</p>
                  {(r.title || r.organization) && <p>{[r.title, r.organization].filter(Boolean).join(", ")}</p>}
                  {r.phone && (
                    <p>
                      <span className="font-bold">T:</span> {r.phone}
                    </p>
                  )}
                  {r.email && (
                    <p className="break-all">
                      <span className="font-bold">E:</span> {r.email}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </SideSection>
        )}

        {cv.hobbies.length > 0 && (
          <SideSection title="Hobbies">
            <ul className="space-y-[1.8mm] text-[7.6pt] uppercase tracking-wide">
              {cv.hobbies.map((h, i) => (
                <li key={i} className="flex gap-[2mm]">
                  <span aria-hidden>•</span>
                  {h}
                </li>
              ))}
            </ul>
          </SideSection>
        )}
      </aside>

      {/* ---------- page ---------- */}
      <main className="relative overflow-hidden px-[9mm] pb-[12mm] pt-[11mm]">
        <TanzaniaFlagWatermark />

        {emblem && (
          // eslint-disable-next-line @next/next/no-img-element -- a local static file; hidden if absent
          <img
            src={EMBLEM_SRC}
            alt="Coat of arms of Tanzania"
            onError={() => setEmblem(false)}
            className="absolute right-[6mm] top-[6mm] h-[15mm] w-auto object-contain"
          />
        )}

        <header className={`relative mb-[7mm] flex items-start justify-between gap-[6mm] ${emblem ? "pr-[16mm]" : ""}`}>
          <div className="min-w-0">
            <h1 className="text-[25pt] font-bold uppercase leading-[1.05] tracking-[0.12em] text-[#2b2b2b]">
              {first}
              {rest.length > 0 && (
                <>
                  <br />
                  {rest.join(" ")}
                </>
              )}
            </h1>
            {cv.title && <p className="mt-[2.5mm] text-[7.6pt] uppercase tracking-[0.25em] text-[#6b6b6b]">{cv.title}</p>}
          </div>
          <dl className="shrink-0 space-y-[1.6mm] pt-[1mm] text-right text-[7.6pt] text-[#4a4a4a]">
            {cv.address && <dd className="max-w-[48mm]">{cv.address}</dd>}
            {cv.phone && <dd>{cv.phone}</dd>}
            {cv.email && <dd className="break-all">{cv.email}</dd>}
          </dl>
        </header>

        {cv.experience.length > 0 && (
          <MainSection title="Work experience">
            {cv.experience.map((e) => (
              <TimelineRow
                key={e.key}
                left={[e.organization, e.place, [e.start, e.end].filter(Boolean).join(" - ")]}
                title={e.title}
                points={e.points}
              />
            ))}
          </MainSection>
        )}

        {cv.education.length > 0 && (
          <MainSection title="Education">
            {cv.education.map((e) => (
              <TimelineRow
                key={e.id}
                left={[e.organization, e.place, [e.start, e.end].filter(Boolean).join(" - ")]}
                title={e.title}
                points={e.points}
              />
            ))}
          </MainSection>
        )}

        {cv.skills.length > 0 && (
          <MainSection title="Skills">
            <Levels items={cv.skills} columns={3} />
          </MainSection>
        )}

        {cv.languages.length > 0 && (
          <MainSection title="Languages">
            <Levels items={cv.languages} columns={3} />
          </MainSection>
        )}

        <Declaration cv={cv} />
      </main>
    </article>
  );
}

function SideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-[7mm]">
      <h2 className="mb-[3mm] border-b border-white/25 pb-[1.6mm] text-[8.2pt] font-bold uppercase tracking-[0.12em] text-white">{title}</h2>
      {children}
    </section>
  );
}

function MainSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="relative mb-[6mm] break-inside-avoid-page">
      <h2 className="mb-[3.5mm] border-b-[0.4mm] border-[#2b2b2b] pb-[1.4mm] text-[8.6pt] font-bold uppercase tracking-[0.12em]">{title}</h2>
      {children}
    </section>
  );
}

/** Organisation / place / dates on the left, a dot on the timeline, the title and bullets on the right. */
function TimelineRow({ left, title, points }: { left: string[]; title: string; points: string[] }) {
  const [org, place, dates] = left;
  return (
    <div className="relative grid grid-cols-[38mm_1fr] gap-[6mm] pb-[4.5mm] break-inside-avoid">
      <div className="text-[7.6pt] leading-[1.35]">
        {org && <p className="font-bold uppercase">{org}</p>}
        {place && <p className="text-[#555]">{place}</p>}
        {dates && <p className="text-[#555]">{dates}</p>}
      </div>
      <span aria-hidden className="absolute bottom-0 left-[41mm] top-[1mm] w-[0.3mm] bg-[#9a9a9a]" />
      <span aria-hidden className="absolute left-[40.2mm] top-[1.2mm] h-[2mm] w-[2mm] rounded-full bg-[#2b2b2b]" />
      <div className="pl-[1mm]">
        <p className="font-bold">{title}</p>
        {points.length > 0 && (
          <ul className="mt-[1mm] space-y-[0.6mm] text-[#444]">
            {points.filter(Boolean).map((p, i) => (
              <li key={i} className="flex gap-[1.8mm]">
                <span aria-hidden>•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Levels({ items, columns }: { items: CvLevel[]; columns: number }) {
  return (
    <div className="grid gap-x-[7mm] gap-y-[3.5mm]" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((s) => (
        <div key={s.name} className="break-inside-avoid">
          <p className="mb-[1.2mm] truncate text-[7pt] uppercase tracking-wide text-[#444]">{s.name}</p>
          <div className="relative h-[1.2mm] bg-[#d6d6d6]">
            <div className="absolute inset-y-0 left-0 bg-[#3a3a3a]" style={{ width: `${(Math.min(5, Math.max(1, s.level)) / 5) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The CV is valid once signed: the declaration, the member's drawn signature, their name and the date. */
function Declaration({ cv }: { cv: CvView }) {
  return (
    <section className="relative mt-[8mm] break-inside-avoid">
      <h2 className="mb-[3mm] border-b-[0.4mm] border-[#2b2b2b] pb-[1.4mm] text-[8.6pt] font-bold uppercase tracking-[0.12em]">Declaration</h2>
      <p className="text-[#444]">I declare that the information given in this curriculum vitae is true and correct to the best of my knowledge.</p>
      <div className="mt-[5mm] flex items-end justify-between gap-[8mm]">
        <div className="w-[62mm]">
          <div className="flex h-[16mm] items-end">
            {cv.signature ? (
              // eslint-disable-next-line @next/next/no-img-element -- the member's own drawn signature (data URL)
              <img src={cv.signature} alt={`Signature of ${cv.name}`} className="max-h-[16mm] max-w-full object-contain" />
            ) : (
              <span className="cv-unsigned mb-[2mm] text-[7.4pt] italic text-[#9a9a9a]">Not signed yet</span>
            )}
          </div>
          <div className="border-t-[0.3mm] border-[#2b2b2b] pt-[1mm] text-[7.4pt] uppercase tracking-wide">{cv.name}</div>
        </div>
        <div className="w-[38mm] text-right">
          <div className="flex h-[16mm] items-end justify-end pb-[1mm]">
            {cv.signedAt && new Date(cv.signedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="border-t-[0.3mm] border-[#2b2b2b] pt-[1mm] text-[7.4pt] uppercase tracking-wide">Date</div>
        </div>
      </div>
    </section>
  );
}

/**
 * Flag of Tanzania waving in the wind, very faint behind the page: green and blue halves split by a
 * yellow-edged black diagonal, a wavy cloth outline, the stripes rippled by a displacement filter,
 * and soft light/dark folds. Drawn here (vector), so it stays crisp on paper and needs no image file.
 */
function TanzaniaFlagWatermark() {
  // Unique ids: the CV can be on screen and in the print frame at once. (useId's colons break url(#…).)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [shape, wave, folds] = [`cvflag-shape-${uid}`, `cvflag-wave-${uid}`, `cvflag-folds-${uid}`];
  // The cloth: wavy top and bottom edges, the fly end (right) bowing with the wind.
  const outline =
    "M14 30 C54 6 96 52 140 30 S226 6 270 30 C278 82 280 130 270 184 C226 206 184 160 140 184 S54 206 14 184 C8 132 8 82 14 30 Z";
  return (
    <svg
      aria-hidden
      viewBox="0 0 284 214"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute left-1/2 top-[46%] w-[150mm] -translate-x-1/2 -translate-y-1/2 -rotate-6 opacity-[0.11]"
    >
      <defs>
        <clipPath id={shape}>
          <path d={outline} />
        </clipPath>
        {/* Ripples the stripes like cloth (fixed seed: every CV looks the same). */}
        <filter id={wave} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0065 0.011" numOctaves="1" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Folds: light crests and dark troughs, in step with the wavy outline. */}
        <linearGradient id={folds} x1="0" y1="0" x2="1" y2="0.18">
          <stop offset="0" stopColor="#000" stopOpacity="0.28" />
          <stop offset="0.16" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.32" stopColor="#000" stopOpacity="0.3" />
          <stop offset="0.49" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.66" stopColor="#000" stopOpacity="0.3" />
          <stop offset="0.83" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${shape})`}>
        <g filter={`url(#${wave})`}>
          <path d="M0 214V0h284z" fill="#1eb53a" />
          <path d="M0 214h284V0z" fill="#00a3dd" />
          <path d="M0 214 284 0" stroke="#fcd116" strokeWidth="66" />
          <path d="M0 214 284 0" stroke="#111" strokeWidth="44" />
        </g>
        <rect width="284" height="214" fill={`url(#${folds})`} />
      </g>
    </svg>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/**
 * The same CV laid out for a phone screen: header with photo, name and contact, then every section
 * stacked at readable sizes. Screen only: Download PDF always prints the A4 CvDocument.
 */
export function CvMobile({ cv }: { cv: CvView }) {
  const photo = mediaUrl(cv.photo);
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <article className="overflow-hidden rounded-2xl bg-white text-[14px] leading-relaxed text-[#2b2b2b] shadow-xl">
      <header className="bg-[#414448] px-5 pb-6 pt-7 text-center text-[#e9e9e9]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed private URL
          <img src={photo} alt="" className="mx-auto h-28 w-28 rounded-full border-4 border-white/90 object-cover" />
        ) : (
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/90 bg-[#5a5d61] text-3xl font-bold">
            {initials(cv.name)}
          </div>
        )}
        <h1 className="mt-4 text-2xl font-bold uppercase tracking-[0.12em] text-white">{cv.name}</h1>
        {cv.title && <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/70">{cv.title}</p>}
        <div className="mt-4 space-y-0.5 text-[13px] text-white/85">
          {cv.address && <p>{cv.address}</p>}
          {cv.phone && <p>{cv.phone}</p>}
          {cv.email && <p className="break-all">{cv.email}</p>}
        </div>
      </header>

      <div className="relative space-y-6 px-5 py-6">
        {cv.about && (
          <MSection title="About me">
            <p className="whitespace-pre-line text-[#444]">{cv.about}</p>
          </MSection>
        )}
        {cv.experience.length > 0 && (
          <MSection title="Work experience">
            {cv.experience.map((e) => (
              <MEntry key={e.key} title={e.title} org={e.organization} place={e.place} dates={[e.start, e.end].filter(Boolean).join(" - ")} points={e.points} />
            ))}
          </MSection>
        )}
        {cv.education.length > 0 && (
          <MSection title="Education">
            {cv.education.map((e) => (
              <MEntry key={e.id} title={e.title} org={e.organization} place={e.place} dates={[e.start, e.end].filter(Boolean).join(" - ")} points={e.points} />
            ))}
          </MSection>
        )}
        {cv.skills.length > 0 && (
          <MSection title="Skills">
            <MLevels items={cv.skills} />
          </MSection>
        )}
        {cv.languages.length > 0 && (
          <MSection title="Languages">
            <MLevels items={cv.languages} />
          </MSection>
        )}
        {cv.links.length > 0 && (
          <MSection title="Links">
            {cv.links.map((l, i) => (
              <p key={i}>
                <span className="font-bold">{l.label}: </span>
                <a href={l.url} className="break-all underline underline-offset-2">{l.url.replace(/^https?:\/\//, "")}</a>
              </p>
            ))}
          </MSection>
        )}
        {cv.referees.length > 0 && (
          <MSection title={cv.referees.length > 1 ? "References" : "Reference"}>
            {cv.referees.map((r) => (
              <div key={r.id} className="mb-3 last:mb-0">
                <p className="font-bold uppercase tracking-wide">{r.name}</p>
                {(r.title || r.organization) && <p className="text-[#555]">{[r.title, r.organization].filter(Boolean).join(", ")}</p>}
                {r.phone && <p className="text-[#555]">T: {r.phone}</p>}
                {r.email && <p className="break-all text-[#555]">E: {r.email}</p>}
              </div>
            ))}
          </MSection>
        )}
        {cv.hobbies.length > 0 && (
          <MSection title="Hobbies">
            <p className="text-[13px] uppercase tracking-wide text-[#444]">{cv.hobbies.join(" · ")}</p>
          </MSection>
        )}
        <MSection title="Declaration">
          <p className="text-[#444]">I declare that the information given in this curriculum vitae is true and correct to the best of my knowledge.</p>
          <div className="mt-3 flex h-16 items-end">
            {cv.signature ? (
              // eslint-disable-next-line @next/next/no-img-element -- the member's own drawn signature
              <img src={cv.signature} alt={`Signature of ${cv.name}`} className="max-h-16 max-w-[70%] object-contain" />
            ) : (
              <span className="text-[13px] italic text-[#9a9a9a]">Not signed yet</span>
            )}
          </div>
          <div className="flex justify-between border-t border-[#2b2b2b] pt-1 text-[11px] uppercase tracking-wide">
            <span>{cv.name}</span>
            <span>{cv.signedAt ? date(cv.signedAt) : "Date"}</span>
          </div>
        </MSection>
      </div>
    </article>
  );
}

function MSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 border-b-2 border-[#2b2b2b] pb-1 text-[12px] font-bold uppercase tracking-[0.12em]">{title}</h2>
      {children}
    </section>
  );
}

function MEntry({ title, org, place, dates, points }: { title: string; org: string; place: string; dates: string; points: string[] }) {
  return (
    <div className="relative mb-4 border-l-2 border-[#c4c4c4] pl-4 last:mb-0">
      <span aria-hidden className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#2b2b2b]" />
      <p className="font-bold">{title}</p>
      <p className="text-[12px] uppercase tracking-wide text-[#555]">{[org, place].filter(Boolean).join(", ")}</p>
      {dates && <p className="text-[12px] text-[#777]">{dates}</p>}
      {points.filter(Boolean).length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-[#444]">
          {points.filter(Boolean).map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MLevels({ items }: { items: CvLevel[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3">
      {items.map((s) => (
        <div key={s.name}>
          <p className="mb-1 truncate text-[11px] uppercase tracking-wide text-[#444]">{s.name}</p>
          <div className="relative h-1.5 bg-[#d6d6d6]">
            <div className="absolute inset-y-0 left-0 bg-[#3a3a3a]" style={{ width: `${(Math.min(5, Math.max(1, s.level)) / 5) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
