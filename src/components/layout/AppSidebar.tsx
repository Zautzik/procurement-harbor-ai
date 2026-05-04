import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Warehouse,
  Ship,
  TrendingUp,
  FileText,
  Settings,
  Bot,
  Calculator,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import logoMark from "@/assets/logo-harbor.png";

export function AppSidebar() {
  const { t } = useTranslation();
  const operations = [
    { title: t("dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("inventory"), url: "/inventory", icon: Package },
    { title: t("warehouses"), url: "/warehouses", icon: Warehouse },
    { title: t("shipments"), url: "/shipments", icon: Ship },
    { title: t("orders"), url: "/orders", icon: FileText },
  ];
  const intelligence = [
    { title: t("chat"), url: "/chat", icon: MessageSquare },
    { title: t("trends"), url: "/trends", icon: TrendingUp },
    { title: t("costing"), url: "/costing", icon: Calculator },
    { title: t("aiAgent"), url: "/ai-agent", icon: Bot },
  ];
  const bottomItems = [
    { title: t("audit"), url: "/audit", icon: History },
    { title: t("settings"), url: "/settings", icon: Settings },
  ];
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const renderItem = (item: { title: string; url: string; icon: any }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.url)}
        tooltip={item.title}
        className="group/item h-10 rounded-lg px-3 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-inset"
      >
        <NavLink to={item.url} end={item.url === "/"} activeClassName="">
          <span className="relative flex h-5 w-5 items-center justify-center">
            <item.icon className="h-[18px] w-[18px] transition-transform duration-200 group-hover/item:scale-110" />
            {isActive(item.url) && (
              <span className="absolute -left-3 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
            )}
          </span>
          {!collapsed && <span className="text-[13px] font-medium tracking-tight">{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border/60 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-steel shadow-soft-md ring-1 ring-sidebar-primary/20">
            <img
              src={logoMark}
              alt="Procurement & Harbor"
              className="h-7 w-7 object-contain"
              width={40}
              height={40}
            />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary shadow-glow" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-heading text-[13px] font-bold tracking-tight text-sidebar-accent-foreground">
                Procurement
              </span>
              <span className="font-heading text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-primary">
                & Harbor
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
              Operations
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{operations.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
              Intelligence
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{intelligence.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <SidebarMenu className="gap-0.5">
          {bottomItems.map(renderItem)}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("logout")}
              className="h-10 rounded-lg px-3 text-sidebar-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
              }}
            >
              <LogOut className="h-[18px] w-[18px]" />
              {!collapsed && <span className="text-[13px] font-medium">{t("logout")}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-sidebar-accent/50 px-3 py-2">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary text-primary" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/70">
              Live · Synced
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
