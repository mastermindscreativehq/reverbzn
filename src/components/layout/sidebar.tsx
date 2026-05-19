"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Music2,
  BarChart3,
  Globe,
  Users,
  Link2,
  Megaphone,
  Zap,
  Lightbulb,
  Bell,
  Settings,
  Radio,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navItems = [
  {
    group: "COMMAND CENTER",
    items: [
      { href: "/dashboard",      label: "Overview",      icon: LayoutDashboard },
      { href: "/tracks",         label: "Track Intel",   icon: Music2 },
      { href: "/platforms",      label: "Platforms",     icon: BarChart3 },
      { href: "/regions",        label: "Regions",       icon: Globe },
    ],
  },
  {
    group: "AUDIENCE",
    items: [
      { href: "/fans",           label: "Fan CRM",       icon: Users,      badge: "10" },
      { href: "/smart-links",    label: "Smart Links",   icon: Link2 },
    ],
  },
  {
    group: "GROWTH ENGINE",
    items: [
      { href: "/campaigns",      label: "Campaigns",     icon: Megaphone },
      { href: "/automations",    label: "Autopilot",     icon: Zap,        badge: "3 ON" },
      { href: "/insights",       label: "Insights",      icon: Lightbulb,  badge: "5" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { href: "/notifications",  label: "Notifications", icon: Bell,       badge: "4" },
      { href: "/settings",       label: "Settings",      icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 shrink-0 border-r border-border/50 bg-sidebar h-screen sticky top-0 overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan/10 border border-cyan/30">
          <Radio className="w-4 h-4 text-cyan" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-widest text-foreground">REVERBZN</div>
          <div className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">OS v1.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {navItems.map((group) => (
          <div key={group.group}>
            <div className="px-2 mb-2 text-[9px] font-mono font-semibold tracking-widest text-muted-foreground/60 uppercase">
              {group.group}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group",
                        isActive
                          ? "bg-cyan/10 text-cyan border border-cyan/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-cyan" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="flex-1">{item.label}</span>
                      {"badge" in item && item.badge && (
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-4 font-mono",
                            isActive
                              ? "bg-cyan/20 text-cyan border-cyan/30"
                              : "bg-white/5 text-muted-foreground border-white/10"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && <ChevronRight className="w-3 h-3 text-cyan/50" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Artist Profile */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-white/3 border border-border/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan/40 to-violet/40 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
            RZ
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">ReverbZn</div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
              <span className="text-[10px] font-mono text-muted-foreground">LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
