import type { Metadata } from "next";
import MyPortfolio from "../My_portfolio";
import { ProfileActions } from "@/components/app/Engage";
import { VisitorReturnBar } from "@/components/app/VisitorReturnBar";
import { getPublicProfile } from "@/lib/server-api";

type Props = {
  searchParams: Promise<{ u?: string; user?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { u, user } = await searchParams;
  const username = u || user;
  if (username) {
    const p = await getPublicProfile(username);
    if (p) {
      return {
        title: `${p.display_name} · Portfolio Preview`,
        description: p.portfolio.tagline || p.headline || p.bio?.slice(0, 160) || "Proof-backed portfolio",
      };
    }
  }
  return {
    title: "Portfolio Preview · Home Proofolio",
    description: "Live preview of personal proof-backed portfolio.",
  };
}

export default async function PortfolioPreviewPage({ searchParams }: Props) {
  const { u, user } = await searchParams;
  const targetUser = u || user;

  if (targetUser) {
    const p = await getPublicProfile(targetUser);
    if (p) {
      return (
        <>
          <VisitorReturnBar profileUsername={p.username} />
          <MyPortfolio publicProfile={p} />
          <ProfileActions username={p.username} displayName={p.display_name} preview={false} />
        </>
      );
    }
  }

  return (
    <>
      <VisitorReturnBar />
      <MyPortfolio />
      <ProfileActions username="me" displayName="You" preview={true} />
    </>
  );
}
