"use client";

import { useState } from "react";
import { AgendaPageView } from "./agenda/agenda-view";
import { ApprovalsPageView } from "./approvals/approvals-view";
import { DashboardPageView } from "./dashboard/dashboard-view";
import { Sidebar as AppSidebar } from "./layout/sidebar";
import { MyReservationsPageView } from "./my-reservations/my-reservations-view";
import { NewRequestPageView } from "./requests/new-request-view";
import { roleLabels } from "./reservations/constants";
import type { ReservationWorkspaceProps, View } from "./reservations/types";
import { RegistrationsPageView } from "./registrations/registrations-view";
import { SpacesPageView } from "./spaces/spaces-view";

const pageTitles: Record<View, [string, string]> = {
  dashboard: ["Painel do dia", "Agenda operacional da instituicao"],
  "new-request": ["Nova solicitacao", "Encontre um ambiente e envie para aprovacao"],
  "my-reservations": ["Minhas reservas", "Acompanhe suas solicitacoes e reservas"],
  approvals: ["Aprovacoes", "Solicitacoes aguardando decisao"],
  agenda: ["Agenda", "Reservas recentes e bloqueios"],
  spaces: ["Ambientes", "Salas e laboratorios cadastrados"],
  "registrations-academic": ["Cadastros", "Base academica"],
  "registrations-spaces": ["Cadastros", "Ambientes"],
  "registrations-approvers": ["Cadastros", "Aprovadores por curso"],
  "registrations-users": ["Cadastros", "Usuarios e perfis"],
  "registrations-resources": ["Cadastros", "Recursos dos ambientes"],
};

const allowedViews: Record<View, string[]> = {
  dashboard: ["DOCENTE", "APROVADOR", "ADMIN", "DISCENTE"],
  "new-request": ["DOCENTE"],
  "my-reservations": ["DOCENTE"],
  approvals: ["APROVADOR", "ADMIN"],
  agenda: ["DOCENTE", "APROVADOR", "ADMIN", "DISCENTE"],
  spaces: ["DOCENTE", "APROVADOR", "ADMIN", "DISCENTE"],
  "registrations-academic": ["ADMIN"],
  "registrations-spaces": ["ADMIN"],
  "registrations-approvers": ["ADMIN"],
  "registrations-users": ["ADMIN"],
  "registrations-resources": ["ADMIN"],
};

export function ReservationWorkspace(props: ReservationWorkspaceProps) {
  const [collapsed, setCollapsed] = useState(false);
  const canView = allowedViews[props.view].includes(props.currentUser.role);

  return (
    <main className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <AppSidebar
        collapsed={collapsed}
        currentUser={props.currentUser}
        setCollapsed={setCollapsed}
      />
      <section className="content">
        <PageTopbar {...props} />
        {!canView && <AccessDeniedView />}
        {canView && <ActiveView {...props} />}
      </section>
    </main>
  );
}

function ActiveView(props: ReservationWorkspaceProps) {
  switch (props.view) {
    case "dashboard":
      return <DashboardPageView {...props} />;
    case "new-request":
      return <NewRequestPageView {...props} />;
    case "my-reservations":
      return <MyReservationsPageView {...props} />;
    case "approvals":
      return <ApprovalsPageView {...props} />;
    case "agenda":
      return <AgendaPageView {...props} />;
    case "spaces":
      return <SpacesPageView {...props} />;
    case "registrations-academic":
      return <RegistrationsPageView {...props} section="academic" />;
    case "registrations-spaces":
      return <RegistrationsPageView {...props} section="spaces" />;
    case "registrations-approvers":
      return <RegistrationsPageView {...props} section="approvers" />;
    case "registrations-users":
      return <RegistrationsPageView {...props} section="users" />;
    case "registrations-resources":
      return <RegistrationsPageView {...props} section="resources" />;
    default:
      return null;
  }
}

function PageTopbar({ currentUser, view }: ReservationWorkspaceProps) {
  const [eyebrow, title] = pageTitles[view];

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="profile-cluster">
        <div>
          <span>Usuario logado</span>
          <strong>{currentUser.name}</strong>
        </div>
        <div>
          <span>Perfil</span>
          <strong>{roleLabels[currentUser.role] ?? currentUser.role}</strong>
        </div>
      </div>
    </header>
  );
}

function AccessDeniedView() {
  return (
    <section className="access-denied-panel">
      <p className="eyebrow">Acesso restrito</p>
      <h2>Esta area nao esta disponivel para o perfil atual.</h2>
      <p>
        Use o menu lateral para navegar pelas areas liberadas para o usuario
        selecionado.
      </p>
    </section>
  );
}
