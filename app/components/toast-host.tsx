"use client";

import { Check, Info, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ToastTone = "success" | "info" | "error";

type ToastMessage = {
  title: string;
  description: string;
  tone: ToastTone;
};

const toastMessages: Record<string, ToastMessage> = {
  "alunos-invalidos": {
    title: "Quantidade invalida",
    description: "Informe uma quantidade de alunos maior que zero.",
    tone: "error",
  },
  "horario-invalido": {
    title: "Horario invalido",
    description: "O horario final precisa ser maior que o horario inicial.",
    tone: "error",
  },
  "conflito-horario": {
    title: "Horario indisponivel",
    description: "Esse ambiente ja possui uma reserva aprovada ou pendente nesse periodo.",
    tone: "error",
  },
  "conflito-aprovacao": {
    title: "Conflito ao aprovar",
    description: "Ja existe uma reserva aprovada para esse ambiente no mesmo horario.",
    tone: "error",
  },
  "sem-permissao-aprovacao": {
    title: "Acesso nao permitido",
    description: "Seu perfil nao pode decidir solicitacoes desse curso.",
    tone: "error",
  },
  "motivo-recusa-obrigatorio": {
    title: "Motivo obrigatorio",
    description: "Informe o motivo da recusa antes de finalizar a decisao.",
    tone: "error",
  },
  "curso-duplicado": {
    title: "Curso ja cadastrado",
    description: "Ja existe um curso com esse codigo. Use outro codigo ou confira a base atual.",
    tone: "error",
  },
  "disciplina-duplicada": {
    title: "Disciplina ja cadastrada",
    description: "Esse curso ja possui uma disciplina com o mesmo codigo.",
    tone: "error",
  },
  "turma-duplicada": {
    title: "Turma ja cadastrada",
    description: "Esse curso ja possui uma turma com esse nome.",
    tone: "error",
  },
  "capacidade-invalida": {
    title: "Capacidade invalida",
    description: "Informe uma capacidade maior que zero para o ambiente.",
    tone: "error",
  },
  "ambiente-duplicado": {
    title: "Ambiente ja cadastrado",
    description: "Ja existe um ambiente com esse nome.",
    tone: "error",
  },
  "aprovador-invalido": {
    title: "Aprovador invalido",
    description: "Selecione um usuario com perfil de aprovador ou administrador.",
    tone: "error",
  },
  "solicitacao-enviada": {
    title: "Solicitacao enviada",
    description: "Ela foi encaminhada para aprovacao e ja aparece em Minhas Reservas.",
    tone: "success",
  },
  "solicitacao-aprovada": {
    title: "Solicitacao aprovada",
    description: "A reserva foi confirmada e passou a bloquear oficialmente o horario.",
    tone: "success",
  },
  "solicitacao-recusada": {
    title: "Solicitacao recusada",
    description: "O motivo informado ficou registrado para acompanhamento do docente.",
    tone: "info",
  },
  "curso-criado": {
    title: "Curso criado",
    description: "O curso ja pode ser usado em disciplinas, turmas e solicitacoes.",
    tone: "success",
  },
  "disciplina-criada": {
    title: "Disciplina criada",
    description: "A disciplina ja aparece nas solicitacoes do curso selecionado.",
    tone: "success",
  },
  "turma-criada": {
    title: "Turma criada",
    description: "A turma ja pode ser vinculada a novas solicitacoes.",
    tone: "success",
  },
  "ambiente-criado": {
    title: "Ambiente criado",
    description: "O ambiente ja entra nas recomendacoes quando atender aos criterios.",
    tone: "success",
  },
  "aprovador-vinculado": {
    title: "Aprovador vinculado",
    description: "Novas solicitacoes desse curso serao direcionadas para esse aprovador.",
    tone: "success",
  },
  "aprovador-removido": {
    title: "Aprovador removido",
    description: "Se o curso ficar sem aprovador, as solicitacoes vao para a fila geral.",
    tone: "info",
  },
};

export function ToastHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toastKey = searchParams.get("toast");
  const toast = useMemo(
    () => (toastKey ? toastMessages[toastKey] : undefined),
    [toastKey],
  );
  const [visibleToast, setVisibleToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!toast) return;

    setVisibleToast(toast);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("toast");
    const nextQuery = nextParams.toString();
    window.history.replaceState(null, "", `${pathname}${nextQuery ? `?${nextQuery}` : ""}`);

    const timeout = window.setTimeout(() => {
      setVisibleToast(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams, toast]);

  if (!visibleToast) return null;

  const Icon =
    visibleToast.tone === "success" ? Check : visibleToast.tone === "error" ? X : Info;

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      <article className={`toast-card ${visibleToast.tone}`}>
        <div className="toast-icon">
          <Icon size={18} />
        </div>
        <div>
          <strong>{visibleToast.title}</strong>
          <p>{visibleToast.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setVisibleToast(null)}
          title="Fechar aviso"
        >
          <X size={16} />
        </button>
      </article>
    </div>
  );
}
