import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AlertsBell } from "./AlertsBell";
import { Outlet } from "react-router-dom";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useEffect, useState } from "react";
import { CommandPalette, CommandPaletteTrigger } from "@/components/CommandPalette";
import { OnboardingTour } from "@/components/OnboardingTour";

export function AppLayout() {
  useLanguageSync();
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <SidebarProvider>
      <div className="dark min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" />
            <div className="hidden h-5 w-px bg-border md:block" />
            <div className="hidden items-center gap-2 md:flex">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary text-primary" />
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Command Center
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <CommandPaletteTrigger />
              <div className="hidden items-center gap-3 rounded-lg border border-border/60 bg-card/50 px-3 py-1.5 md:flex">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  CLP/USD
                </span>
                <span className="text-xs font-semibold tabular-nums text-foreground">945.20</span>
                <span className="text-[10px] font-medium tabular-nums text-success">+0.4%</span>
              </div>
              <span className="hidden text-xs tabular-nums text-muted-foreground md:inline">
                {time.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <AlertsBell />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-gradient-surface">
            <Outlet />
          </main>
        </div>
        <CommandPalette />
        <OnboardingTour />
      </div>
    </SidebarProvider>
  );
}
