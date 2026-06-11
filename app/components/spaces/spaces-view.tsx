"use client";

import { Building2 } from "lucide-react";
import { spaceTypeLabels } from "../reservations/constants";
import {
  formatTimeRange,
  getDailyOperationalStatus,
  inputDateFromValue,
  minutesFromDateTime,
} from "../reservations/date-utils";
import type { ReservationWorkspaceProps } from "../reservations/types";

export function SpacesPageView({
  initialDate,
  reservationRequests,
  spaces,
}: ReservationWorkspaceProps) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayRequests = reservationRequests.filter(
    (request) => inputDateFromValue(request.startAt) === initialDate,
  );

  return (
    <section className="environment-strip single-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cadastro base</p>
          <h2>Ambientes cadastrados</h2>
        </div>
        <Building2 size={22} />
      </div>
      <div className="environment-grid">
        {spaces.map((space) => {
          const spaceRequests = todayRequests
            .filter((request) => request.space.id === space.id)
            .sort(
              (a, b) =>
                new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
            );
          const currentRequest = spaceRequests.find((request) => {
            const startMinutes = minutesFromDateTime(request.startAt);
            const endMinutes = minutesFromDateTime(request.endAt);

            return (
              ["PENDENTE", "APROVADA"].includes(request.status) &&
              startMinutes <= nowMinutes &&
              endMinutes >= nowMinutes
            );
          });
          const nextRequest = spaceRequests.find((request) => {
            const startMinutes = minutesFromDateTime(request.startAt);

            return (
              ["PENDENTE", "APROVADA"].includes(request.status) &&
              startMinutes > nowMinutes
            );
          });
          const availability = currentRequest
            ? getDailyOperationalStatus(currentRequest, nowMinutes)
            : {
                label: "Livre agora",
                className: "livre",
              };

          return (
            <article className={`environment-card ${availability.className}`} key={space.id}>
              <span className={`status-pill ${availability.className}`}>
                {availability.label}
              </span>
              <strong>{space.name}</strong>
              <span>
                {spaceTypeLabels[space.type]} - {space.capacity} lugares
              </span>
              <p>{space.location}</p>
              <div className="tag-row">
                {space.resources.map(({ resource }) => (
                  <span key={resource.id}>{resource.name}</span>
                ))}
              </div>
              <div className="environment-next">
                <span>Proxima reserva</span>
                <strong>
                  {nextRequest
                    ? `${formatTimeRange(nextRequest.startAt, nextRequest.endAt)} - ${nextRequest.course.code}`
                    : "Sem novas reservas hoje"}
                </strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
