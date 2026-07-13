"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface AuditLogDetail {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  userId?: string | null;
  userDisplayName?: string | null;
  httpMethod?: string | null;
  requestPath?: string | null;
  ipAddress?: string | null;
  oldValues?: string | null;
  newValues?: string | null;
  changedColumns?: string | null;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
}

function parseJsonValue(
  value?: string | null
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }

    return {
      value: parsed,
    };
  } catch {
    return {
      value,
    };
  }
}

export default function AuditLogDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const auditLogId = params.id;

  const [auditLog, setAuditLog] =
    useState<AuditLogDetail | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const token =
      localStorage.getItem(
        "saharut_access_token"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    async function loadAuditLog() {
      try {
        const response = await fetch(
          `${API_URL}/audit-logs/${auditLogId}`,
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

        if (response.status === 403) {
          throw new Error(
            "Bu denetim kaydını görüntüleme yetkiniz bulunmuyor."
          );
        }

        const result =
          (await response.json()) as
            ApiResponse<AuditLogDetail>;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ??
              "Denetim kaydı alınamadı."
          );
        }

        setAuditLog(result.data);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadAuditLog();
  }, [auditLogId, router]);

  const oldValues =
    useMemo(
      () =>
        parseJsonValue(
          auditLog?.oldValues
        ),
      [auditLog?.oldValues]
    );

  const newValues =
    useMemo(
      () =>
        parseJsonValue(
          auditLog?.newValues
        ),
      [auditLog?.newValues]
    );

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "full",
        timeStyle: "medium",
      }
    ).format(new Date(value));
  }

  function formatEntity(value: string) {
    return value
      .replaceAll("_", " ")
      .replace(
        /([a-z])([A-Z])/g,
        "$1 $2"
      );
  }

  function formatValue(value: unknown) {
    if (
      value === null ||
      value === undefined
    ) {
      return "—";
    }

    if (typeof value === "boolean") {
      return value
        ? "Evet"
        : "Hayır";
    }

    if (typeof value === "object") {
      return JSON.stringify(
        value,
        null,
        2
      );
    }

    return String(value);
  }

  function getActionLabel(value: string) {
    const labels:
      Record<string, string> = {
        CREATE: "Oluşturma",
        UPDATE: "Güncelleme",
        DELETE: "Silme",
        STATUS_CHANGE:
          "Durum değişikliği",
        ASSIGN: "Atama",
        REMOVE: "Kaldırma",
      };

    return labels[value] ?? value;
  }

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  if (isLoading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-spinner" />

        <p>
          Denetim kaydı yükleniyor...
        </p>
      </main>
    );
  }

  if (!auditLog) {
    return (
      <main className="dashboard-error">
        <h1>
          Denetim kaydı bulunamadı
        </h1>

        <p>{error}</p>

        <Link
          className="primary-link-button"
          href="/settings/audit-logs"
        >
          Kayıt listesine dön
        </Link>
      </main>
    );
  }

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Denetim Kayıtları
            </span>

            <h1>İşlem detayı</h1>

            <p>
              Sistem değişikliğinin teknik
              ve veri detaylarını inceleyin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/settings/audit-logs"
            >
              Kayıt listesine dön
            </Link>

            <button
              className="logout-button"
              type="button"
              onClick={handleLogout}
            >
              Çıkış yap
            </button>
          </div>
        </header>

        <section className="audit-detail-hero">
          <div className="audit-detail-icon">
            ≡
          </div>

          <div className="audit-detail-title">
            <span>
              {formatEntity(
                auditLog.entityName
              )}
            </span>

            <h2>
              {getActionLabel(
                auditLog.action
              )}
            </h2>

            <code>
              {auditLog.entityId}
            </code>
          </div>

          <div className="audit-detail-badges">
            <span
              className={`audit-action audit-action-${auditLog.action.toLowerCase()}`}
            >
              {getActionLabel(
                auditLog.action
              )}
            </span>

            <span
              className={`http-method http-${(
                auditLog.httpMethod ??
                "GET"
              ).toLowerCase()}`}
            >
              {auditLog.httpMethod ??
                "—"}
            </span>
          </div>
        </section>

        <section className="role-summary-grid">
          <article className="company-stat-card">
            <span>İşlemi yapan</span>

            <strong>
              {auditLog.userDisplayName ??
                "Sistem"}
            </strong>

            <p>
              Kullanıcı veya sistem işlemi
            </p>
          </article>

          <article className="company-stat-card">
            <span>IP adresi</span>

            <strong>
              {auditLog.ipAddress ??
                "—"}
            </strong>

            <p>
              İsteğin geldiği adres
            </p>
          </article>

          <article className="company-stat-card">
            <span>İşlem tarihi</span>

            <strong>
              {new Intl.DateTimeFormat(
                "tr-TR",
                {
                  dateStyle: "medium",
                }
              ).format(
                new Date(
                  auditLog.createdAt
                )
              )}
            </strong>

            <p>
              {new Intl.DateTimeFormat(
                "tr-TR",
                {
                  timeStyle: "medium",
                }
              ).format(
                new Date(
                  auditLog.createdAt
                )
              )}
            </p>
          </article>
        </section>

        <section className="detail-grid">
          <article className="detail-panel">
            <h2>İşlem bilgileri</h2>

            <div className="detail-list">
              <div>
                <span>Varlık türü</span>

                <strong>
                  {formatEntity(
                    auditLog.entityName
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Varlık kimliği
                </span>

                <strong>
                  {auditLog.entityId}
                </strong>
              </div>

              <div>
                <span>İşlem türü</span>

                <strong>
                  {getActionLabel(
                    auditLog.action
                  )}
                </strong>
              </div>

              <div>
                <span>Kullanıcı ID</span>

                <strong>
                  {auditLog.userId ??
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Tarih ve saat
                </span>

                <strong>
                  {formatDate(
                    auditLog.createdAt
                  )}
                </strong>
              </div>
            </div>
          </article>

          <article className="detail-panel">
            <h2>İstek bilgileri</h2>

            <div className="detail-list">
              <div>
                <span>HTTP metodu</span>

                <strong>
                  {auditLog.httpMethod ??
                    "—"}
                </strong>
              </div>

              <div>
                <span>Endpoint</span>

                <strong>
                  {auditLog.requestPath ??
                    "—"}
                </strong>
              </div>

              <div>
                <span>IP adresi</span>

                <strong>
                  {auditLog.ipAddress ??
                    "—"}
                </strong>
              </div>

              <div>
                <span>
                  Değişen alanlar
                </span>

                <strong>
                  {auditLog.changedColumns ??
                    "—"}
                </strong>
              </div>
            </div>
          </article>
        </section>

        <section className="audit-change-grid">
          <article className="audit-change-panel old">
            <div className="audit-change-header">
              <div>
                <span>
                  Önceki durum
                </span>

                <h2>Eski değerler</h2>
              </div>

              <span className="audit-change-badge">
                Önce
              </span>
            </div>

            {!oldValues ? (
              <div className="audit-empty-values">
                Bu işlem için eski değer
                bulunmuyor.
              </div>
            ) : (
              <div className="audit-value-list">
                {Object.entries(
                  oldValues
                ).map(
                  ([key, value]) => (
                    <div
                      className="audit-value-row"
                      key={key}
                    >
                      <span>{key}</span>

                      <pre>
                        {formatValue(
                          value
                        )}
                      </pre>
                    </div>
                  )
                )}
              </div>
            )}
          </article>

          <article className="audit-change-panel new">
            <div className="audit-change-header">
              <div>
                <span>
                  Sonraki durum
                </span>

                <h2>Yeni değerler</h2>
              </div>

              <span className="audit-change-badge">
                Sonra
              </span>
            </div>

            {!newValues ? (
              <div className="audit-empty-values">
                Bu işlem için yeni değer
                bulunmuyor.
              </div>
            ) : (
              <div className="audit-value-list">
                {Object.entries(
                  newValues
                ).map(
                  ([key, value]) => (
                    <div
                      className="audit-value-row"
                      key={key}
                    >
                      <span>{key}</span>

                      <pre>
                        {formatValue(
                          value
                        )}
                      </pre>
                    </div>
                  )
                )}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}