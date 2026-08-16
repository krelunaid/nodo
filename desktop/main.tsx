import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NodoApp } from "@/components/nodo/app";
import "@/styles.css";

const root = document.getElementById("nodo-root");
if (!root) throw new Error("nodo-root missing");
createRoot(root).render(
  <StrictMode>
    <NodoApp />
  </StrictMode>,
);
