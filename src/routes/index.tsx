import { createFileRoute } from "@tanstack/react-router";
import { NodoApp } from "@/components/nodo/app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <NodoApp />;
}
