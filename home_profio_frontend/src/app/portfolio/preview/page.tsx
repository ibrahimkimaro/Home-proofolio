import MyPortfolio from "../My_portfolio";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio Preview · Home Proofolio",
  description: "Live preview of your personal proof-backed portfolio.",
};

export default function PortfolioPreviewPage() {
  return <MyPortfolio />;
}
