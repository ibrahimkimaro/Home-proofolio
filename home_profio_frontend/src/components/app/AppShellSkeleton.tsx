"use client";

import Image from "next/image";

export function AppShellSkeleton() {
  return (
    <div className="theme-mono pf-ambient flex min-h-screen w-full bg-paper-dim text-ink-800" aria-busy="true" aria-label="Loading page...">
      {/* Desktop sidebar placeholder */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-paper px-3 md:flex">
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-3">
          <Image
            src="/images/home-profolio-logo.jpeg"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-cover opacity-80"
          />
          <div className="h-4 w-24 rounded-md shimmer" />
        </div>

        <div className="mt-3 space-y-6 pb-6">
          {/* Main Links */}
          <div className="space-y-1">
            <div className="flex h-10 items-center gap-3 rounded-xl px-3 shimmer" />
            <div className="flex h-10 items-center gap-3 rounded-xl px-3 shimmer opacity-70" />
            <div className="flex h-10 items-center gap-3 rounded-xl px-3 shimmer opacity-50" />
          </div>

          {/* Group 1 */}
          <div className="space-y-2">
            <div className="h-3 w-28 rounded-md shimmer opacity-60 ml-2" />
            <div className="space-y-1">
              <div className="h-9 rounded-lg shimmer opacity-80" />
              <div className="h-9 rounded-lg shimmer opacity-60" />
              <div className="h-9 rounded-lg shimmer opacity-40" />
            </div>
          </div>

          {/* Group 2 */}
          <div className="space-y-2">
            <div className="h-3 w-20 rounded-md shimmer opacity-60 ml-2" />
            <div className="space-y-1">
              <div className="h-9 rounded-lg shimmer opacity-70" />
              <div className="h-9 rounded-lg shimmer opacity-50" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Placeholder */}
        <header
          className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline/50 bg-paper/85 px-4 backdrop-blur-xl sm:px-6"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          {/* Mobile logo placeholder */}
          <div className="flex items-center gap-2.5 md:hidden">
            <Image
              src="/images/home-profolio-logo.jpeg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-cover opacity-80"
            />
            <div className="h-4 w-20 rounded-md shimmer" />
          </div>

          {/* Search bar placeholder */}
          <div className="hidden max-w-md flex-1 md:block">
            <div className="h-10 w-full rounded-lg shimmer" />
          </div>

          {/* Header Action Placeholders */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden h-10 w-20 rounded-lg shimmer md:block" />
            <div className="h-9 w-9 rounded-full shimmer" />
            <div className="h-9 w-9 rounded-full shimmer" />
          </div>
        </header>

        {/* Content Body Shimmer */}
        <main className="flex-1 p-4 sm:p-8 space-y-6 max-w-7xl w-full mx-auto pb-28 md:pb-12">
          {/* Page Title & Subtitle Shimmer */}
          <div className="space-y-2">
            <div className="h-8 w-48 sm:w-64 rounded-xl shimmer" />
            <div className="h-4 w-72 sm:w-96 rounded-md shimmer opacity-70" />
          </div>

          {/* Metric / Action Cards Shimmer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-28 rounded-2xl border border-hairline bg-paper p-4 space-y-3">
              <div className="h-4 w-24 rounded shimmer opacity-60" />
              <div className="h-8 w-16 rounded-lg shimmer" />
              <div className="h-3 w-32 rounded shimmer opacity-50" />
            </div>
            <div className="h-28 rounded-2xl border border-hairline bg-paper p-4 space-y-3">
              <div className="h-4 w-28 rounded shimmer opacity-60" />
              <div className="h-8 w-20 rounded-lg shimmer" />
              <div className="h-3 w-36 rounded shimmer opacity-50" />
            </div>
            <div className="h-28 rounded-2xl border border-hairline bg-paper p-4 space-y-3 hidden sm:block">
              <div className="h-4 w-20 rounded shimmer opacity-60" />
              <div className="h-8 w-14 rounded-lg shimmer" />
              <div className="h-3 w-28 rounded shimmer opacity-50" />
            </div>
            <div className="h-28 rounded-2xl border border-hairline bg-paper p-4 space-y-3 hidden lg:block">
              <div className="h-4 w-32 rounded shimmer opacity-60" />
              <div className="h-8 w-24 rounded-lg shimmer" />
              <div className="h-3 w-40 rounded shimmer opacity-50" />
            </div>
          </div>

          {/* Main Feed / Card Section Shimmer */}
          <div className="rounded-2xl border border-hairline bg-paper p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-hairline/60">
              <div className="h-5 w-40 rounded-md shimmer" />
              <div className="h-8 w-24 rounded-lg shimmer opacity-70" />
            </div>

            {/* List Rows */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-hairline/40 bg-paper-dim/40">
                  <div className="h-12 w-12 rounded-xl shimmer shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 w-3/4 max-w-sm rounded shimmer" />
                    <div className="h-3 w-1/2 max-w-xs rounded shimmer opacity-60" />
                  </div>
                  <div className="h-7 w-20 rounded-full shimmer opacity-80 shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation placeholder */}
      <nav
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline/60 bg-paper/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid h-16 grid-cols-5 items-center px-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center justify-center gap-1">
              <div className="h-5 w-5 rounded-md shimmer" />
              <div className="h-2 w-8 rounded shimmer opacity-60" />
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
