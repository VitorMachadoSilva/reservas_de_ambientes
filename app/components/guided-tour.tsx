"use client";

import { ChevronLeft, ChevronRight, CircleHelp, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TourStep = {
  description: string;
  placement?: "top" | "right" | "bottom" | "left";
  target: string;
  title: string;
};

type TargetRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const commonSteps: TourStep[] = [
  {
    target: ".sidebar",
    title: "Menu principal",
    description: "Use a barra lateral para navegar pelas areas disponiveis para o seu perfil.",
    placement: "right",
  },
  {
    target: ".topbar-actions",
    title: "Preferencias e perfil",
    description: "Aqui ficam o tema visual, o usuario logado e o perfil ativo.",
    placement: "left",
  },
];

const tourByPath: Record<string, TourStep[]> = {
  "/painel": [
    ...commonSteps,
    {
      target: ".metrics-grid",
      title: "Resumo operacional",
      description: "Estes indicadores mostram rapidamente reservas, pendencias e disponibilidade do dia.",
    },
    {
      target: ".daily-grid",
      title: "Operacao do momento",
      description: "Acompanhe ambientes em uso agora e atalhos importantes para a rotina.",
    },
  ],
  "/nova-solicitacao": [
    ...commonSteps,
    {
      target: ".step-tabs",
      title: "Etapas da solicitacao",
      description: "Avance pelas etapas para preencher dados academicos, criterios, ambiente e revisao.",
    },
    {
      target: ".request-panel",
      title: "Formulario da reserva",
      description: "Este painel concentra os campos e validacoes antes do envio da solicitacao.",
    },
    {
      target: ".recommendation-panel",
      title: "Ambiente selecionado",
      description: "Aqui aparece o ambiente escolhido e um resumo da recomendacao.",
      placement: "left",
    },
  ],
  "/minhas-reservas": [
    ...commonSteps,
    {
      target: ".my-reservations-toolbar",
      title: "Filtros das reservas",
      description: "Pesquise reservas e filtre por status sem perder o contexto da lista.",
    },
    {
      target: ".reservation-list",
      title: "Lista de reservas",
      description: "Cada item mostra horario, status, finalidade e acoes disponiveis.",
    },
  ],
  "/aprovacoes": [
    ...commonSteps,
    {
      target: ".approval-filters",
      title: "Filtros de aprovacao",
      description: "Use filtros e busca para encontrar solicitacoes que precisam de analise.",
    },
    {
      target: ".approval-workspace",
      title: "Analise da solicitacao",
      description: "Selecione uma solicitacao para revisar detalhes, historico e decidir.",
    },
  ],
  "/agenda": [
    ...commonSteps,
    {
      target: ".agenda-controls",
      title: "Filtros da agenda",
      description: "Escolha a data e o status para visualizar as reservas relevantes.",
    },
    {
      target: ".timeline",
      title: "Linha do tempo",
      description: "A lista mostra as reservas do filtro selecionado e seu estado operacional.",
    },
  ],
  "/ambientes": [
    ...commonSteps,
    {
      target: ".environment-grid",
      title: "Ambientes cadastrados",
      description: "Cada card mostra disponibilidade, capacidade, recursos e proxima reserva.",
    },
    {
      target: ".environment-card .status-pill",
      title: "Disponibilidade",
      description: "Este indicador resume se o ambiente esta livre, ocupado ou pendente agora.",
    },
  ],
  "/relatorios": [
    {
      target: ".standalone-back-link",
      title: "Retorno ao painel",
      description: "Use este atalho para voltar ao painel operacional.",
      placement: "bottom",
    },
    {
      target: ".report-kpi-grid",
      title: "Indicadores principais",
      description: "Acompanhe volume, aprovacao, pendencias e risco do periodo selecionado.",
    },
    {
      target: ".reports-grid",
      title: "Analises detalhadas",
      description: "Veja distribuicao por status, ambientes mais usados e rankings institucionais.",
    },
  ],
  "/login": [
    {
      target: ".login-hero",
      title: "Entrada do sistema",
      description: "Esta tela permite simular o acesso com um perfil cadastrado.",
      placement: "bottom",
    },
    {
      target: ".login-user-grid",
      title: "Perfis disponiveis",
      description: "Escolha um usuario para acessar o sistema com as permissoes desse perfil.",
    },
  ],
  "/cadastros/academico": [
    ...commonSteps,
    {
      target: ".registration-tabs",
      title: "Areas de cadastro",
      description: "Alterne entre as bases de cursos, ambientes, aprovadores, usuarios e recursos.",
    },
    {
      target: ".registrations-page",
      title: "Gestao academica",
      description: "Gerencie cursos, disciplinas e turmas usadas nas solicitacoes.",
    },
  ],
  "/cadastros/ambientes": [
    ...commonSteps,
    {
      target: ".registration-tabs",
      title: "Areas de cadastro",
      description: "Alterne entre as bases administrativas do sistema.",
    },
    {
      target: ".registrations-page",
      title: "Cadastro de ambientes",
      description: "Cadastre, filtre e mantenha os ambientes e seus recursos.",
    },
  ],
  "/cadastros/aprovadores": [
    ...commonSteps,
    {
      target: ".registration-tabs",
      title: "Areas de cadastro",
      description: "Alterne entre as bases administrativas do sistema.",
    },
    {
      target: ".registrations-page",
      title: "Aprovadores por curso",
      description: "Vincule aprovadores responsaveis por analisar solicitacoes de cada curso.",
    },
  ],
  "/cadastros/usuarios": [
    ...commonSteps,
    {
      target: ".registration-tabs",
      title: "Areas de cadastro",
      description: "Alterne entre as bases administrativas do sistema.",
    },
    {
      target: ".registrations-page",
      title: "Usuarios e perfis",
      description: "Gerencie usuarios ativos e seus perfis de acesso.",
    },
  ],
  "/cadastros/recursos": [
    ...commonSteps,
    {
      target: ".registration-tabs",
      title: "Areas de cadastro",
      description: "Alterne entre as bases administrativas do sistema.",
    },
    {
      target: ".registrations-page",
      title: "Recursos dos ambientes",
      description: "Mantenha os recursos que podem ser associados aos ambientes.",
    },
  ],
};

export function GuidedTour() {
  const pathname = usePathname();
  const steps = useMemo(() => tourByPath[pathname] ?? [], [pathname]);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const visibleSteps = useMemo(
    () =>
      steps.filter((step) => {
        if (typeof document === "undefined") return false;
        return Boolean(document.querySelector(step.target));
      }),
    [steps, active],
  );
  const currentStep = visibleSteps[stepIndex] ?? visibleSteps[0];

  useEffect(() => {
    setActive(false);
    setStepIndex(0);
  }, [pathname]);

  useEffect(() => {
    if (!active || !currentStep) return;

    function updateTargetRect() {
      const element = document.querySelector(currentStep.target);
      if (!element) {
        setTargetRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setTargetRect({
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      });
    }

    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [active, currentStep]);

  if (steps.length === 0) return null;

  function openTour() {
    setStepIndex(0);
    setActive(true);
  }

  function closeTour() {
    setActive(false);
    setStepIndex(0);
  }

  function goToStep(direction: 1 | -1) {
    setStepIndex((current) => {
      const next = current + direction;
      return Math.min(Math.max(next, 0), visibleSteps.length - 1);
    });
  }

  const popoverStyle = getPopoverStyle(targetRect, currentStep?.placement);

  return (
    <>
      <button
        className="guided-tour-button"
        type="button"
        title="Abrir tutorial guiado"
        aria-label="Abrir tutorial guiado"
        onClick={openTour}
      >
        <CircleHelp size={22} />
      </button>

      {active && currentStep && (
        <div className="guided-tour-layer" role="dialog" aria-label="Tutorial guiado">
          <div className="guided-tour-scrim" />
          {targetRect && (
            <div
              className="guided-tour-highlight"
              style={{
                height: targetRect.height + 14,
                left: targetRect.left - 7,
                top: targetRect.top - 7,
                width: targetRect.width + 14,
              }}
            />
          )}
          <section className="guided-tour-popover" style={popoverStyle}>
            <div className="guided-tour-header">
              <span>
                {stepIndex + 1} de {visibleSteps.length}
              </span>
              <button type="button" title="Fechar tutorial" aria-label="Fechar tutorial" onClick={closeTour}>
                <X size={16} />
              </button>
            </div>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.description}</p>
            <div className="guided-tour-actions">
              <button type="button" disabled={stepIndex === 0} onClick={() => goToStep(-1)}>
                <ChevronLeft size={16} />
                Anterior
              </button>
              {stepIndex === visibleSteps.length - 1 ? (
                <button type="button" className="primary-action" onClick={closeTour}>
                  Concluir
                </button>
              ) : (
                <button type="button" className="primary-action" onClick={() => goToStep(1)}>
                  Proximo
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function getPopoverStyle(
  rect: TargetRect | null,
  placement: TourStep["placement"] = "bottom",
) {
  if (!rect) {
    return {
      bottom: 88,
      right: 24,
    };
  }

  const gap = 18;
  const width = 320;
  const margin = 16;
  const viewportWidth = typeof window === "undefined" ? 1200 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
  const centeredLeft = rect.left + rect.width / 2 - width / 2;

  if (placement === "left") {
    return {
      left: clamp(rect.left - width - gap, margin, viewportWidth - width - margin),
      top: clamp(rect.top, margin, viewportHeight - 220),
    };
  }

  if (placement === "right") {
    return {
      left: clamp(rect.left + rect.width + gap, margin, viewportWidth - width - margin),
      top: clamp(rect.top, margin, viewportHeight - 220),
    };
  }

  if (placement === "top") {
    return {
      left: clamp(centeredLeft, margin, viewportWidth - width - margin),
      top: clamp(rect.top - 220 - gap, margin, viewportHeight - 220),
    };
  }

  return {
    left: clamp(centeredLeft, margin, viewportWidth - width - margin),
    top: clamp(rect.top + rect.height + gap, margin, viewportHeight - 220),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
