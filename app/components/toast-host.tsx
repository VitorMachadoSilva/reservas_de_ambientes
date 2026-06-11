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

  const Icon = visibleToast.tone === "success" ? Check : Info;

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
