"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TerminalPanel } from "@/components/layout/terminal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [terminalOpen, setTerminalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background grid-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </main>
      <TerminalPanel isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
    </div>
  );
}
