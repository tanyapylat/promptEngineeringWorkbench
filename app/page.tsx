"use client";

import dynamic from "next/dynamic";
import { WorkbenchProvider } from "@/lib/store";

const AppShell = dynamic(
  () => import("@/components/app-shell").then((m) => m.AppShell),
  {
    ssr: false,
  },
);

export default function Page() {
  return (
    <WorkbenchProvider>
      <AppShell />
    </WorkbenchProvider>
  );
}
