"use client";

import { Check, Info, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ToastTone = "success" | "info" | "error";

type ToastMessage = {
  id: string;
  title: string;
  description: string;
  tone: ToastTone;
};

type ToastTemplate = Omit<ToastMessage, "id">;

const toastMessages: Record<string, ToastTemplate> = {
  "login-realizado": {
    title: "Login realizado",
    description: "Sessao iniciada com o perfil selecionado.",
    tone: "success",
  },
  "logout-realizado": {
    title: "Sessao encerrada",
    description: "Voce saiu do sistema com seguranca.",
    tone: "info",
  },
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
  "motivo-cancelamento-obrigatorio": {
    title: "Motivo obrigatorio",
    description: "Informe o motivo para cancelar uma solicitacao pendente.",
    tone: "error",
  },
  "sem-permissao-cancelamento": {
    title: "Cancelamento nao permitido",
    description: "Voce so pode cancelar solicitacoes feitas pelo seu usuario.",
    tone: "error",
  },
  "cancelamento-indisponivel": {
    title: "Cancelamento indisponivel",
    description: "Somente solicitacoes pendentes podem ser canceladas pelo docente.",
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
  "reserva-cancelada": {
    title: "Solicitacao cancelada",
    description: "O cancelamento foi registrado com o motivo informado.",
    tone: "info",
  },
  "curso-criado": {
    title: "Curso criado",
    description: "O curso ja pode ser usado em disciplinas, turmas e solicitacoes.",
    tone: "success",
  },
  "curso-atualizado": {
    title: "Curso atualizado",
    description: "As informacoes do curso foram salvas.",
    tone: "success",
  },
  "curso-inativado": {
    title: "Curso inativado",
    description: "Ele nao aparecera em novas solicitacoes, mas o historico foi preservado.",
    tone: "info",
  },
  "curso-ativado": {
    title: "Curso ativado",
    description: "O curso voltou a ficar disponivel para novas solicitacoes.",
    tone: "success",
  },
  "disciplina-criada": {
    title: "Disciplina criada",
    description: "A disciplina ja aparece nas solicitacoes do curso selecionado.",
    tone: "success",
  },
  "disciplina-atualizada": {
    title: "Disciplina atualizada",
    description: "As informacoes da disciplina foram salvas.",
    tone: "success",
  },
  "disciplina-inativada": {
    title: "Disciplina inativada",
    description: "Ela nao aparecera em novas solicitacoes, mas o historico foi preservado.",
    tone: "info",
  },
  "disciplina-ativada": {
    title: "Disciplina ativada",
    description: "A disciplina voltou a ficar disponivel para novas solicitacoes.",
    tone: "success",
  },
  "turma-criada": {
    title: "Turma criada",
    description: "A turma ja pode ser vinculada a novas solicitacoes.",
    tone: "success",
  },
  "turma-atualizada": {
    title: "Turma atualizada",
    description: "As informacoes da turma foram salvas.",
    tone: "success",
  },
  "turma-inativada": {
    title: "Turma inativada",
    description: "Ela nao aparecera em novas solicitacoes, mas o historico foi preservado.",
    tone: "info",
  },
  "turma-ativada": {
    title: "Turma ativada",
    description: "A turma voltou a ficar disponivel para novas solicitacoes.",
    tone: "success",
  },
  "ambiente-criado": {
    title: "Ambiente criado",
    description: "O ambiente ja entra nas recomendacoes quando atender aos criterios.",
    tone: "success",
  },
  "ambiente-atualizado": {
    title: "Ambiente atualizado",
    description: "As informacoes do ambiente foram salvas com sucesso.",
    tone: "success",
  },
  "ambiente-inativado": {
    title: "Ambiente inativado",
    description: "Ele nao aparecera em novas recomendacoes, mas o historico foi preservado.",
    tone: "info",
  },
  "ambiente-ativado": {
    title: "Ambiente ativado",
    description: "O ambiente voltou a aparecer nas recomendacoes e consultas ativas.",
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
  "usuario-duplicado": {
    title: "Usuario ja cadastrado",
    description: "Ja existe um usuario com esse e-mail.",
    tone: "error",
  },
  "usuario-criado": {
    title: "Usuario criado",
    description: "O usuario ja pode ser selecionado no login simulado.",
    tone: "success",
  },
  "usuario-atualizado": {
    title: "Usuario atualizado",
    description: "As informacoes e o perfil do usuario foram salvos.",
    tone: "success",
  },
  "usuario-inativado": {
    title: "Usuario inativado",
    description: "Ele deixa de aparecer no login e em novas configuracoes.",
    tone: "info",
  },
  "usuario-ativado": {
    title: "Usuario ativado",
    description: "O usuario voltou a ficar disponivel no sistema.",
    tone: "success",
  },
  "recurso-duplicado": {
    title: "Recurso ja cadastrado",
    description: "Ja existe um recurso com esse nome.",
    tone: "error",
  },
  "recurso-criado": {
    title: "Recurso criado",
    description: "Ele ja pode ser vinculado aos ambientes.",
    tone: "success",
  },
  "recurso-atualizado": {
    title: "Recurso atualizado",
    description: "As informacoes do recurso foram salvas.",
    tone: "success",
  },
  "recurso-inativado": {
    title: "Recurso inativado",
    description: "Ele nao aparecera em novos vinculos, mas o historico foi preservado.",
    tone: "info",
  },
  "recurso-ativado": {
    title: "Recurso ativado",
    description: "O recurso voltou a ficar disponivel para ambientes.",
    tone: "success",
  },
};

export function ToastHost() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toastKey = searchParams.get("toast");
  const toastTemplate = useMemo(
    () => (toastKey ? toastMessages[toastKey] : undefined),
    [toastKey],
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const consumedUrlRef = useRef("");

  const removeToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  useEffect(() => {
    if (!toastKey || !toastTemplate) return;

    const currentUrl = `${pathname}?${searchParams.toString()}`;
    if (consumedUrlRef.current === currentUrl) return;
    consumedUrlRef.current = currentUrl;

    const toast: ToastMessage = {
      ...toastTemplate,
      id: `${toastKey}-${crypto.randomUUID()}`,
    };
    const shouldReplaceStack =
      toastKey === "login-realizado" || toastKey === "logout-realizado";

    setToasts((current) =>
      shouldReplaceStack ? [toast] : [...current, toast].slice(-3),
    );

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("toast");
    const nextQuery = nextParams.toString();
    window.history.replaceState(null, "", `${pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }, [pathname, searchParams, toastKey, toastTemplate]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}

function ToastCard({
  onClose,
  toast,
}: {
  onClose: (toastId: string) => void;
  toast: ToastMessage;
}) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onClose(toast.id);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [onClose, toast.id]);

  const Icon = toast.tone === "success" ? Check : toast.tone === "error" ? X : Info;

  return (
    <article className={`toast-card ${toast.tone}`}>
      <div className="toast-icon">
        <Icon size={18} />
      </div>
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.description}</p>
      </div>
      <button type="button" onClick={() => onClose(toast.id)} title="Fechar aviso">
        <X size={16} />
      </button>
    </article>
  );
}
