import MyPortfolio from "../My_portfolio";
import type { Metadata } from "next";
import { ProfileActions } from "@/components/app/Engage";

export const metadata: Metadata = {
  title: "Portfolio Preview · Home Proofolio",
  description: "Live preview of your personal proof-backed portfolio.",
};

export default function PortfolioPreviewPage() {
  return (
    <>
      <MyPortfolio />
      <ProfileActions username="me" displayName="You" preview={true} />
    </>
  );
}

