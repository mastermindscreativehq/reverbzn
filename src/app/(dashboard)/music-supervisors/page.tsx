export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Mail, Film, Star, Clock, DollarSign } from "lucide-react";
import Link from "next/link";
import { getMusicSupervisorsWithOpps } from "@/lib/db/queries";

const mediaTypeLabels: Record<string, string> = {
  tv_series: "TV", game: "Game", documentary: "Doc", film: "Film",
  trailer: "Trailer", advertisement: "Ad", short_film: "Short",
};

const statusConfig: Record<string, string> = {
  active:   "bg-emerald/10 text-emerald border-emerald/20",
  warm:     "bg-amber/10 text-amber border-amber/20",
  prospect: "bg-violet/10 text-violet border-violet/20",
  cold:     "bg-white/5 text-muted-foreground border-white/10",
};

function derivedStatus(lastContactedAt: Date | null, dealCount: number): string {
  if (!lastContactedAt) return "prospect";
  const days = Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / 86400000);
  if (dealCount > 0 && days <= 60) return "active";
  if (days <= 90) return "warm";
  return "cold";
}

export default async function MusicSupervisorsPage() {
  const supervisors = await getMusicSupervisorsWithOpps();

  const totalDeals    = supervisors.reduce((s, sv) => s + sv.dealCount, 0);
  const activeCount   = supervisors.filter(sv => derivedStatus(sv.lastContactedAt, sv.dealCount) === "active").length;
  const openOppsCount = supervisors.reduce((s, sv) => s + sv.openOpps, 0);

  return (
    <div className="flex flex-col">
      <Header
        title="Music Supervisors"
        subtitle="Supervisor CRM · deal history · pitch management"
      />

      <div className="p-6 space-y-8">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Total Supervisors"    value={supervisors.length} icon={<UserCheck className="w-5 h-5" />}   accent="cyan"    delay={0}    />
          <MetricCard title="Active Relationships" value={activeCount}        icon={<Star className="w-5 h-5" />}        accent="emerald" delay={0.05} />
          <MetricCard title="Deals Closed"         value={totalDeals}         icon={<DollarSign className="w-5 h-5" />}  accent="violet"  sublabel="Total placements" delay={0.1} />
          <MetricCard title="Open Briefs"          value={openOppsCount}      icon={<Film className="w-5 h-5" />}        accent="amber"   sublabel="Opportunities live now" delay={0.15} />
        </div>

        {supervisors.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground font-mono">No music supervisors yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {supervisors.map((sv) => {
              const status         = derivedStatus(sv.lastContactedAt, sv.dealCount);
              const lastContactStr = sv.lastContactedAt
                ? new Date(sv.lastContactedAt).toISOString().slice(0, 10)
                : null;
              return (
                <div key={sv.id} className="rounded-xl border border-border/50 bg-card p-5 hover:border-border transition-colors">

                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan/30 to-violet/30 flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                        {sv.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{sv.name}</p>
                        <p className="text-xs text-muted-foreground">{sv.role} · {sv.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {sv.openOpps > 0 && (
                        <Badge className="text-[10px] font-mono bg-emerald/10 text-emerald border-emerald/20">
                          {sv.openOpps} open brief{sv.openOpps !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      <Badge className={`text-[10px] font-mono ${statusConfig[status]}`}>{status}</Badge>
                    </div>
                  </div>

                  {/* Media Types & Genre Focus */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {sv.mediaTypes.map(mt => (
                      <Badge key={mt} className="text-[9px] font-mono bg-white/5 text-muted-foreground border-white/10">
                        {mediaTypeLabels[mt] ?? mt}
                      </Badge>
                    ))}
                    {sv.genreFocus.slice(0, 3).map(g => (
                      <Badge key={g} className="text-[9px] font-mono bg-cyan/10 text-cyan/80 border-cyan/20">{g}</Badge>
                    ))}
                  </div>

                  {/* Credits */}
                  {sv.credits.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1.5">Credits</p>
                      <div className="space-y-0.5">
                        {sv.credits.slice(0, 2).map(c => (
                          <p key={c} className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-cyan/50 shrink-0" /> {c}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {sv.notes && (
                    <p className="text-xs text-muted-foreground leading-relaxed bg-white/3 p-2.5 rounded-lg border border-border/20 mb-3">
                      {sv.notes}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/30">
                    <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> {sv.dealCount} deal{sv.dealCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {lastContactStr ? `Contacted ${lastContactStr}` : "Never contacted"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sv.email && (
                        <a href={`mailto:${sv.email}`} className="flex items-center gap-1 text-xs text-cyan hover:text-cyan/80 transition-colors">
                          <Mail className="w-3 h-3" /> Email
                        </a>
                      )}
                      <Link href="/sync-pitches" className="flex items-center gap-1 text-xs text-violet hover:text-violet/80 transition-colors">
                        <Film className="w-3 h-3" /> Pitches
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
