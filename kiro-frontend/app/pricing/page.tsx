import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — KYROO",
  description: "KYROO is free to start, forever. No credit card needed, cancel anytime.",
  alternates: { canonical: "/pricing" },
};

export default function Pricing() {
  return <PricingClient />;
}
