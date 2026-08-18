import { createFileRoute } from "@tanstack/react-router";
import { TradingDesk } from "@/components/desk/trading-desk";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TradingDesk />;
}
