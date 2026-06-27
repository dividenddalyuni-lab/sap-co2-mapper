import { useMemo } from "react";
import { LayoutDashboard, FileText, BarChart3, Diamond, Database, Sparkles, MessageSquare } from "lucide-react";
import clymaiqLogo from "@/assets/clymaiq-logo-full.png";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { AppScreen } from "@/lib/types";
import { detectAnomalies } from "@/lib/anomaly-detection";

const navSections = [
  {
    label: "ANALYSE",
    items: [
      { id: "dashboard" as AppScreen, label: "Dashboard", icon: LayoutDashboard },
      { id: "anomalies" as AppScreen, label: "Anomalie-Erkennung", icon: Diamond, dynamicBadge: true as const },
      { id: "savings" as AppScreen, label: "KI-Sparpotenzial", icon: Sparkles },
    ],
  },
  {
    label: "COMPLIANCE",
    items: [
      { id: "csrd-report" as AppScreen, label: "CSRD Report", icon: FileText },
      { id: "ai-assistant" as AppScreen, label: "KI-Assistent", icon: Diamond },
    ],
  },
  {
    label: "ERFASSUNG",
    items: [
      { id: "supplier-chat" as AppScreen, label: "Kunden-Chat", icon: MessageSquare },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { id: "upload" as AppScreen, label: "Datenquellen", icon: Database },
    ],
  },
];

export default function Sidebar() {
  const { screen, setScreen, calculatedLines } = useApp();
  const anomalyCount = useMemo(() => detectAnomalies(calculatedLines).length, [calculatedLines]);

  return (
    <aside className="w-56 min-h-screen bg-sidebar flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-3 py-4 flex items-center justify-start bg-background">
        <img src={clymaiqLogo} alt="CLYMAIQ ESG Platform" className="w-[85%] h-auto object-contain" />
      </div>

      <div className="h-3" />

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5 mt-2">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-2 text-[10px] font-semibold tracking-widest text-sidebar-muted uppercase">
              {section.label}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              const badgeValue =
                "dynamicBadge" in item && item.dynamicBadge ? anomalyCount : null;
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-active text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badgeValue !== null && badgeValue > 0 && (
                    <span className="px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] text-center">
                      {badgeValue}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 text-xs text-sidebar-muted">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-green" />
          <span>SAP FICO — synchronisiert</span>
        </div>
        <div className="text-[10px] text-sidebar-muted/60 mt-1 ml-4">Letzte Aktualisierung: 11.03.2026, 14:42</div>
      </div>
    </aside>
  );
}
