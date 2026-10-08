import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const subpath = path.join("/");
  const backendBase = process.env.API_INTERNAL_URL || "http://backend:8000";
  const search = req.nextUrl.search || "";
  const url = `${backendBase}/ai/${subpath}${search}`;

  try {
    const headers: Record<string, string> = {};
    const contentType = req.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    const cookie = req.headers.get("cookie");
    if (cookie) headers["cookie"] = cookie;

    const auth = req.headers.get("authorization");
    if (auth) headers["authorization"] = auth;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    const init: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.text();
    }

    const res = await fetch(url, init);
    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI Proxy Error";
    return NextResponse.json({ detail: "AI model is taking longer to respond. Please try again in a moment." }, { status: 504 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
