"use client";

import { createWork, saveAppearancePreference, saveOnboardingAnswers } from "@/lib/api";

/**
 * Everything a new member chose while signing up that belongs to their account: the kind of work, their first
 * piece of work with its skills and evidence, and how they set up the look of the app.
 * Sign-up creates the account first, then saves these. Whatever can't be saved right then (a dropped connection,
 * a server hiccup) is kept in this browser and retried when the app opens, so nothing a member chose is lost.
 */
export interface OnboardingData {
  answers?: { discipline: string | null; answers: Record<string, string | string[]> };
  work?: Parameters<typeof createWork>[0];
  appearance?: object;
}

const KEY = "proofolio-onboarding-pending";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Try each part (twice). Returns what still couldn't be saved, or null when everything was. */
export async function saveOnboardingData(data: OnboardingData): Promise<OnboardingData | null> {
  const left: OnboardingData = {};
  const attempt = async (save: () => Promise<unknown>) => {
    for (let i = 0; i < 2; i++) {
      try {
        await save();
        return true;
      } catch {
        if (i === 0) await wait(600);
      }
    }
    return false;
  };
  if (data.answers && !(await attempt(() => saveOnboardingAnswers(data.answers!)))) left.answers = data.answers;
  if (data.work && !(await attempt(() => createWork(data.work!)))) left.work = data.work;
  if (data.appearance && !(await attempt(() => saveAppearancePreference(data.appearance!)))) left.appearance = data.appearance;
  return left.answers || left.work || left.appearance ? left : null;
}

export function stashOnboarding(data: OnboardingData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

/** Retry what was left over from sign-up. Does nothing (and makes no API call) when nothing is waiting. */
export async function flushOnboarding(): Promise<void> {
  let data: OnboardingData | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    data = raw ? (JSON.parse(raw) as OnboardingData) : null;
  } catch {
    data = null;
  }
  if (!data) return;
  const left = await saveOnboardingData(data);
  try {
    if (left) localStorage.setItem(KEY, JSON.stringify(left));
    else localStorage.removeItem(KEY);
  } catch {}
}
