"use client";

import { logoutUser } from "@/app/actions";
import {
  Building2,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Send,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingButton } from "../pending-button";
import type { User } from "../reservations/types";

type SidebarProps = {
  collapsed: boolean;
  currentUser: User;
  setCollapsed: (collapsed: boolean) => void;
};

export function Sidebar({ collapsed, currentUser, setCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Painel", icon: LayoutDashboard },
    {
      href: "/nova-solicitacao",
      label: "Nova solicitacao",
      icon: Send,
      roles: ["DOCENTE"],
    },
    {
      href: "/minhas-reservas",
      label: "Minhas reservas",
      icon: GraduationCap,
      roles: ["DOCENTE"],
    },
    {
    href: "/aprovacoes",
      label: "Aprovacoes",
      icon: Check,
      roles: ["APROVADOR", "ADMIN"],
    },
    {
      href: "/relatorios",
      label: "Relatorios",
      icon: BarChart3,
      roles: ["ADMIN", "APROVADOR"],
    },
    { href: "/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/ambientes", label: "Ambientes", icon: Building2 },
    {
      href: "/cadastros/academico",
      label: "Cadastros",
      icon: Users,
      roles: ["ADMIN"],
    },
  ].filter((item) => !item.roles || item.roles.includes(currentUser.role));

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-icon">
          <DoorOpen size={22} />
        </div>
        <div className="brand-copy">
          <strong>Reservas</strong>
          <span>Ambientes academicos</span>
        </div>
      </div>

      <button
        className="sidebar-toggle"
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        <span>{collapsed ? "Expandir" : "Recolher"}</span>
      </button>

      <nav className="nav-list" aria-label="Navegacao principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href.startsWith("/cadastros") && pathname.startsWith("/cadastros"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action={logoutUser} className="logout-form">
        <PendingButton
          className="nav-item logout-button"
          pendingLabel="Saindo..."
          title="Sair"
        >
          <X size={18} />
          <span>Sair</span>
        </PendingButton>
      </form>
    </aside>
  );
}
