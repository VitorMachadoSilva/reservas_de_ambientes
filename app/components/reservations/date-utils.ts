import type { ReservationRequest } from "./types";

type DateValue = string | Date;

export function parseDateTime(date: string, time: string) {
  if (!date || !time) return null;
  return new Date(`${date}T${time}:00`);
}

export function formatDateTime(value: DateValue) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year}, ${hour}:${minute}`;
}

export function formatTimeRange(startAt: DateValue, endAt: DateValue) {
  const formatTime = (value: DateValue) => {
    const date = new Date(value);
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${hour}:${minute}`;
  };

  return `${formatTime(startAt)} - ${formatTime(endAt)}`;
}

export function inputDateFromValue(value: DateValue) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function minutesFromDateTime(value: DateValue) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

export function getDailyOperationalStatus(
  request: ReservationRequest,
  nowMinutes: number,
) {
  if (request.status === "RECUSADA") {
    return {
      key: "RECUSADA",
      label: "Recusada",
      className: "recusada",
    };
  }

  if (request.status === "CANCELADA") {
    return {
      key: "CANCELADA",
      label: "Cancelada",
      className: "cancelada",
    };
  }

  const startMinutes = minutesFromDateTime(request.startAt);
  const endMinutes = minutesFromDateTime(request.endAt);

  if (endMinutes < nowMinutes) {
    return {
      key: "FINALIZADA",
      label: "Finalizada",
      className: "finalizada",
    };
  }

  if (startMinutes <= nowMinutes && endMinutes >= nowMinutes) {
    return {
      key: "AGORA",
      label: request.status === "PENDENTE" ? "Pendente agora" : "Em andamento",
      className: request.status === "PENDENTE" ? "pendente-agora" : "em-andamento",
    };
  }

  if (request.status === "PENDENTE") {
    return {
      key: "PENDENTE",
      label: "Pendente",
      className: "pendente",
    };
  }

  return {
    key: "PROGRAMADA",
    label: "Programada",
    className: "programada",
  };
}

export function hasOverlap(
  request: ReservationRequest,
  selectedSpaceId: string,
  startAt: Date | null,
  endAt: Date | null,
) {
  if (!startAt || !endAt || request.space.id !== selectedSpaceId) return false;
  if (!["PENDENTE", "APROVADA"].includes(request.status)) return false;

  return startAt < new Date(request.endAt) && endAt > new Date(request.startAt);
}
