"use client";

import AppSidebar from "@/app/components/AppSidebar";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface VisitCompany {
  id: string;
  name: string;
  isActive: boolean;
}

interface VisitCustomer {
  id: string;
  name: string;
  code: string;
  customerType: string;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface VisitUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  email?: string | null;
}

interface Visit {
  id: string;
  companyId: string;
  company: VisitCompany;
  customerId: string;
  customer: VisitCustomer;
  assignedUserId: string;
  assignedUser: VisitUser;
  title: string;
  purpose?: string | null;
  plannedStartAt: string;
  plannedEndAt: string;
  status: number;
  statusName: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  checkInLatitude?: number | null;
  checkInLongitude?: number | null;
  checkOutLatitude?: number | null;
  checkOutLongitude?: number | null;
  outcome?: string | null;
  notes?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
  errors?: Record<string, string[]>;
}

interface CurrentUser {
  firstName: string;
  lastName: string;
  roles: string[];
}

type ActionPanel =
  | "none"
  | "checkIn"
  | "checkOut"
  | "complete"
  | "cancel";

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const visitId = params.id;

  const [visit, setVisit] =
    useState<Visit | null>(null);

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [actionPanel, setActionPanel] =
    useState<ActionPanel>("none");

  const [latitude, setLatitude] =
    useState("");

  const [longitude, setLongitude] =
    useState("");

  const [actionNotes, setActionNotes] =
    useState("");

  const [outcome, setOutcome] =
    useState("");

  const [cancellationReason, setCancellationReason] =
    useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("saharut_access_token");

    const storedUser =
      localStorage.getItem("saharut_user");

    if (!token) {
      router.replace("/");
      return;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("saharut_user");
      }
    }

    async function loadVisit() {
      try {
        const response = await fetch(
          `${API_URL}/visits/${visitId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const result =
          (await response.json()) as
            ApiResponse<Visit>;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ??
              "Ziyaret bilgileri alınamadı."
          );
        }

        setVisit(result.data);
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadVisit();
  }, [router, visitId]);

  function formatDate(value?: string | null) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  }

  function getStatusLabel(
    statusName: string
  ) {
    const normalized =
      statusName.toLowerCase();

    if (normalized.includes("planned")) {
      return "Planlandı";
    }

    if (normalized.includes("progress")) {
      return "Devam ediyor";
    }

    if (normalized.includes("completed")) {
      return "Tamamlandı";
    }

    if (normalized.includes("cancelled")) {
      return "İptal edildi";
    }

    return "Kaçırıldı";
  }

  function getStatusClass(
    statusName: string
  ) {
    const normalized =
      statusName.toLowerCase();

    if (normalized.includes("planned")) {
      return "planned";
    }

    if (normalized.includes("progress")) {
      return "progress";
    }

    if (normalized.includes("completed")) {
      return "completed";
    }

    if (normalized.includes("cancelled")) {
      return "cancelled";
    }

    return "missed";
  }

  function resetActionForm() {
    setActionPanel("none");
    setLatitude("");
    setLongitude("");
    setActionNotes("");
    setOutcome("");
    setCancellationReason("");
  }

  function updateVisitStatus(
    status: number,
    statusName: string,
    additionalData?: Partial<Visit>
  ) {
    setVisit((current) =>
      current
        ? {
            ...current,
            status,
            statusName,
            ...additionalData,
          }
        : current
    );
  }

  function getLocation() {
    if (!navigator.geolocation) {
      setIsError(true);
      setMessage(
        "Tarayıcınız konum özelliğini desteklemiyor."
      );
      return;
    }

    setMessage("");
    setIsError(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(
          position.coords.latitude.toString()
        );

        setLongitude(
          position.coords.longitude.toString()
        );

        setMessage(
          "Mevcut konum başarıyla alındı."
        );
      },
      () => {
        setIsError(true);
        setMessage(
          "Konum alınamadı. Tarayıcı konum iznini kontrol edin."
        );
      }
    );
  }

  async function runAction(
    endpoint: string,
    body: Record<string, unknown>
  ) {
    const token =
      localStorage.getItem("saharut_access_token");

    if (!token) {
      router.replace("/");
      return null;
    }

    const response = await fetch(
      `${API_URL}/visits/${visitId}/${endpoint}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/json; charset=utf-8",
        },
        body: JSON.stringify(body),
      }
    );

    const result =
      (await response.json()) as
        ApiResponse<Partial<Visit>>;

    if (!response.ok || !result.success) {
      const validationMessage =
        result.errors
          ? Object.values(result.errors)
              .flat()
              .join(" ")
          : null;

      throw new Error(
        validationMessage ||
          result.message ||
          "İşlem tamamlanamadı."
      );
    }

    return result;
  }

  async function handleCheckIn() {
    try {
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const result = await runAction(
        "check-in",
        {
          latitude:
            latitude.trim()
              ? Number(latitude)
              : null,
          longitude:
            longitude.trim()
              ? Number(longitude)
              : null,
          notes:
            actionNotes.trim() || null,
        }
      );

      if (!result) {
        return;
      }

      updateVisitStatus(
        1,
        "InProgress",
        {
          checkInAt:
            result.data?.checkInAt ??
            new Date().toISOString(),
          checkInLatitude:
            latitude.trim()
              ? Number(latitude)
              : null,
          checkInLongitude:
            longitude.trim()
              ? Number(longitude)
              : null,
        }
      );

      setMessage(
        result.message ??
          "Check-in işlemi tamamlandı."
      );

      resetActionForm();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Check-in yapılamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCheckOut() {
    try {
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const result = await runAction(
        "check-out",
        {
          latitude:
            latitude.trim()
              ? Number(latitude)
              : null,
          longitude:
            longitude.trim()
              ? Number(longitude)
              : null,
          notes:
            actionNotes.trim() || null,
        }
      );

      if (!result) {
        return;
      }

      setVisit((current) =>
        current
          ? {
              ...current,
              checkOutAt:
                result.data?.checkOutAt ??
                new Date().toISOString(),
              checkOutLatitude:
                latitude.trim()
                  ? Number(latitude)
                  : null,
              checkOutLongitude:
                longitude.trim()
                  ? Number(longitude)
                  : null,
            }
          : current
      );

      setMessage(
        result.message ??
          "Check-out işlemi tamamlandı."
      );

      resetActionForm();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Check-out yapılamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleComplete() {
    if (!outcome.trim()) {
      setIsError(true);
      setMessage(
        "Ziyaret sonucu zorunludur."
      );
      return;
    }

    try {
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const result = await runAction(
        "complete",
        {
          outcome: outcome.trim(),
          notes:
            actionNotes.trim() || null,
        }
      );

      if (!result) {
        return;
      }

      updateVisitStatus(
        2,
        "Completed",
        {
          outcome: outcome.trim(),
        }
      );

      setMessage(
        result.message ??
          "Ziyaret başarıyla tamamlandı."
      );

      resetActionForm();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Ziyaret tamamlanamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCancel() {
    if (!cancellationReason.trim()) {
      setIsError(true);
      setMessage(
        "İptal nedeni zorunludur."
      );
      return;
    }

    try {
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const result = await runAction(
        "cancel",
        {
          cancellationReason:
            cancellationReason.trim(),
        }
      );

      if (!result) {
        return;
      }

      updateVisitStatus(
        3,
        "Cancelled",
        {
          cancellationReason:
            cancellationReason.trim(),
        }
      );

      setMessage(
        result.message ??
          "Ziyaret başarıyla iptal edildi."
      );

      resetActionForm();
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Ziyaret iptal edilemedi."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Bu ziyareti silmek istediğinizden emin misiniz?"
      );

    if (!confirmed) {
      return;
    }

    const token =
      localStorage.getItem("saharut_access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      setIsDeleting(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/visits/${visitId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result =
        (await response.json()) as
          ApiResponse<object>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Ziyaret silinemedi."
        );
      }

      router.replace("/visits");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Ziyaret silinemedi."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  if (isLoading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Ziyaret bilgileri yükleniyor...</p>
      </main>
    );
  }

  if (!visit) {
    return (
      <main className="dashboard-error">
        <h1>Ziyaret bulunamadı</h1>
        <p>{message}</p>

        <Link
          className="primary-link-button"
          href="/visits"
        >
          Ziyaret listesine dön
        </Link>
      </main>
    );
  }

  const isPlanned =
    visit.statusName
      .toLowerCase()
      .includes("planned");

  const isInProgress =
    visit.statusName
      .toLowerCase()
      .includes("progress");

  const isCompleted =
    visit.statusName
      .toLowerCase()
      .includes("completed");

  const isCancelled =
    visit.statusName
      .toLowerCase()
      .includes("cancelled");

  const hasCheckedOut =
    Boolean(visit.checkOutAt);

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Ziyaret Detayı
            </span>

            <h1>{visit.title}</h1>

            <p>
              {visit.customer.name} ·{" "}
              {visit.company.name}
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/visits"
            >
              Listeye dön
            </Link>

            {isPlanned && (
    <Link
      className="primary-link-button"
      href={`/visits/${visitId}/edit`}
    >
      Düzenle
    </Link>
  )}

            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
            >
              Çıkış yap
            </button>
          </div>
        </header>

        <section className="visit-profile-card">
          <div className="visit-profile-main">
            <div className="visit-profile-icon">
              ◇
            </div>

            <div>
              <h2>{visit.title}</h2>

              <p>
                {formatDate(
                  visit.plannedStartAt
                )}{" "}
                –{" "}
                {formatDate(
                  visit.plannedEndAt
                )}
              </p>

              <span
                className={`visit-status-badge ${getStatusClass(
                  visit.statusName
                )}`}
              >
                {getStatusLabel(
                  visit.statusName
                )}
              </span>
            </div>
          </div>

          <div className="visit-operation-buttons">
            {isPlanned && (
              <button
                className="visit-start-button"
                type="button"
                onClick={() =>
                  setActionPanel("checkIn")
                }
              >
                Check-in yap
              </button>
            )}

            {isInProgress &&
              !hasCheckedOut && (
                <button
                  className="visit-checkout-button"
                  type="button"
                  onClick={() =>
                    setActionPanel(
                      "checkOut"
                    )
                  }
                >
                  Check-out yap
                </button>
              )}

            {isInProgress &&
              hasCheckedOut && (
                <button
                  className="visit-complete-button"
                  type="button"
                  onClick={() =>
                    setActionPanel(
                      "complete"
                    )
                  }
                >
                  Ziyareti tamamla
                </button>
              )}

            {!isCompleted &&
              !isCancelled && (
                <button
                  className="status-action-button"
                  type="button"
                  onClick={() =>
                    setActionPanel("cancel")
                  }
                >
                  İptal et
                </button>
              )}

            {!isInProgress && (
              <button
                className="danger-action-button"
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting
                  ? "Siliniyor..."
                  : "Ziyareti sil"}
              </button>
            )}
          </div>
        </section>

        {actionPanel !== "none" && (
          <section className="visit-action-panel">
            <div className="form-panel-header">
              <div>
                <h2>
                  {actionPanel === "checkIn" &&
                    "Ziyaret check-in"}

                  {actionPanel === "checkOut" &&
                    "Ziyaret check-out"}

                  {actionPanel === "complete" &&
                    "Ziyareti tamamla"}

                  {actionPanel === "cancel" &&
                    "Ziyareti iptal et"}
                </h2>

                <p>
                  İşlem bilgilerini girip
                  onaylayın.
                </p>
              </div>

              <button
                className="close-action-button"
                type="button"
                onClick={resetActionForm}
              >
                ×
              </button>
            </div>

            {(actionPanel === "checkIn" ||
              actionPanel === "checkOut") && (
              <>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Enlem</label>

                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(event) =>
                        setLatitude(
                          event.target.value
                        )
                      }
                      placeholder="40.7569"
                    />
                  </div>

                  <div className="form-field">
                    <label>Boylam</label>

                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(event) =>
                        setLongitude(
                          event.target.value
                        )
                      }
                      placeholder="30.3781"
                    />
                  </div>

                  <div className="form-field full">
                    <button
                      className="location-button"
                      type="button"
                      onClick={getLocation}
                    >
                      Mevcut konumu kullan
                    </button>
                  </div>

                  <div className="form-field full">
                    <label>İşlem notu</label>

                    <textarea
                      rows={4}
                      value={actionNotes}
                      onChange={(event) =>
                        setActionNotes(
                          event.target.value
                        )
                      }
                      placeholder="İsteğe bağlı işlem notu..."
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    className="cancel-form-button"
                    type="button"
                    onClick={resetActionForm}
                  >
                    Vazgeç
                  </button>

                  <button
                    className="save-form-button"
                    type="button"
                    onClick={
                      actionPanel === "checkIn"
                        ? handleCheckIn
                        : handleCheckOut
                    }
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "İşleniyor..."
                      : actionPanel ===
                          "checkIn"
                        ? "Check-in onayla"
                        : "Check-out onayla"}
                  </button>
                </div>
              </>
            )}

            {actionPanel === "complete" && (
              <>
                <div className="form-field full">
                  <label>Ziyaret sonucu *</label>

                  <textarea
                    rows={5}
                    value={outcome}
                    onChange={(event) =>
                      setOutcome(
                        event.target.value
                      )
                    }
                    placeholder="Görüşme sonucu, müşteri talepleri, sipariş durumu..."
                  />
                </div>

                <div className="form-field full visit-action-notes">
                  <label>Ek not</label>

                  <textarea
                    rows={4}
                    value={actionNotes}
                    onChange={(event) =>
                      setActionNotes(
                        event.target.value
                      )
                    }
                    placeholder="İsteğe bağlı ek not..."
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="cancel-form-button"
                    type="button"
                    onClick={resetActionForm}
                  >
                    Vazgeç
                  </button>

                  <button
                    className="save-form-button"
                    type="button"
                    onClick={handleComplete}
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "Tamamlanıyor..."
                      : "Ziyareti tamamla"}
                  </button>
                </div>
              </>
            )}

            {actionPanel === "cancel" && (
              <>
                <div className="form-field full">
                  <label>İptal nedeni *</label>

                  <textarea
                    rows={5}
                    value={
                      cancellationReason
                    }
                    onChange={(event) =>
                      setCancellationReason(
                        event.target.value
                      )
                    }
                    placeholder="Ziyaretin neden iptal edildiğini açıklayın..."
                  />
                </div>

                <div className="form-actions">
                  <button
                    className="cancel-form-button"
                    type="button"
                    onClick={resetActionForm}
                  >
                    Vazgeç
                  </button>

                  <button
                    className="danger-confirm-button"
                    type="button"
                    onClick={handleCancel}
                    disabled={isProcessing}
                  >
                    {isProcessing
                      ? "İptal ediliyor..."
                      : "İptali onayla"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <section className="detail-grid">
          <article className="detail-panel">
            <h2>Planlama bilgileri</h2>

            <div className="detail-list">
              <div>
                <span>Başlangıç</span>
                <strong>
                  {formatDate(
                    visit.plannedStartAt
                  )}
                </strong>
              </div>

              <div>
                <span>Bitiş</span>
                <strong>
                  {formatDate(
                    visit.plannedEndAt
                  )}
                </strong>
              </div>

              <div>
                <span>Atanan kullanıcı</span>
                <strong>
                  {visit.assignedUser.firstName}{" "}
                  {visit.assignedUser.lastName}
                </strong>
              </div>

              <div>
                <span>Ziyaret amacı</span>
                <strong>
                  {visit.purpose ?? "—"}
                </strong>
              </div>
            </div>
          </article>

          <article className="detail-panel">
            <h2>Müşteri bilgileri</h2>

            <div className="detail-list">
              <div>
                <span>Müşteri</span>
                <strong>
                  {visit.customer.name}
                </strong>
              </div>

              <div>
                <span>Müşteri kodu</span>
                <strong>
                  {visit.customer.code}
                </strong>
              </div>

              <div>
                <span>Tür</span>
                <strong>
                  {visit.customer.customerType}
                </strong>
              </div>

              <div>
                <span>Konum</span>
                <strong>
                  {[
                    visit.customer.district,
                    visit.customer.city,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </strong>
              </div>
            </div>
          </article>

          <article className="detail-panel">
            <h2>Saha işlemleri</h2>

            <div className="detail-list">
              <div>
                <span>Check-in</span>
                <strong>
                  {formatDate(
                    visit.checkInAt
                  )}
                </strong>
              </div>

              <div>
                <span>Check-out</span>
                <strong>
                  {formatDate(
                    visit.checkOutAt
                  )}
                </strong>
              </div>

              <div>
                <span>Check-in konumu</span>
                <strong>
                  {visit.checkInLatitude !=
                    null &&
                  visit.checkInLongitude !=
                    null
                    ? `${visit.checkInLatitude}, ${visit.checkInLongitude}`
                    : "—"}
                </strong>
              </div>

              <div>
                <span>Check-out konumu</span>
                <strong>
                  {visit.checkOutLatitude !=
                    null &&
                  visit.checkOutLongitude !=
                    null
                    ? `${visit.checkOutLatitude}, ${visit.checkOutLongitude}`
                    : "—"}
                </strong>
              </div>
            </div>
          </article>

          <article className="detail-panel">
            <h2>Sonuç ve notlar</h2>

            <div className="detail-text-block">
              <span>Ziyaret sonucu</span>

              <p>
                {visit.outcome ??
                  "Henüz sonuç girilmedi."}
              </p>
            </div>

            <div className="detail-text-block">
              <span>Notlar</span>

              <p>
                {visit.notes ??
                  "Not eklenmemiş."}
              </p>
            </div>

            {visit.cancellationReason && (
              <div className="detail-text-block cancellation-block">
                <span>İptal nedeni</span>

                <p>
                  {
                    visit.cancellationReason
                  }
                </p>
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}