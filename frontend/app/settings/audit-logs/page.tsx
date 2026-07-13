"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const API_URL =
  "http://localhost:5062/api/v1";

interface AuditLog {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  userId?: string | null;
  userDisplayName?: string | null;
  httpMethod?: string | null;
  requestPath?: string | null;
  ipAddress?: string | null;
  changedColumns?: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface PagedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  message?: string | null;
}

export default function AuditLogsPage() {
  const router = useRouter();

  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [search, setSearch] =
    useState("");

  const [entityName, setEntityName] =
    useState("");

  const [action, setAction] =
    useState("");

  const [httpMethod, setHttpMethod] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [page, setPage] =
    useState(1);

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

    const controller =
      new AbortController();

    async function loadLogs() {
      setIsLoading(true);
      setError("");

      const query =
        new URLSearchParams();

      query.set(
        "page",
        page.toString()
      );

      query.set(
        "pageSize",
        "15"
      );

      query.set(
        "sortBy",
        "createdAt"
      );

      query.set(
        "sortDirection",
        "desc"
      );

      if (search.trim()) {
        query.set(
          "search",
          search.trim()
        );
      }

      if (entityName) {
        query.set(
          "entityName",
          entityName
        );
      }

      if (action) {
        query.set(
          "action",
          action
        );
      }

      if (httpMethod) {
        query.set(
          "httpMethod",
          httpMethod
        );
      }

      if (startDate) {
        query.set(
          "startDate",
          new Date(
            `${startDate}T00:00:00`
          ).toISOString()
        );
      }

      if (endDate) {
        query.set(
          "endDate",
          new Date(
            `${endDate}T23:59:59`
          ).toISOString()
        );
      }

      try {
        const response = await fetch(
          `${API_URL}/audit-logs?${query.toString()}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            signal:
              controller.signal,
          }
        );

        if (response.status === 401) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        if (response.status === 403) {
          throw new Error(
            "Denetim kayıtlarını görüntüleme yetkiniz bulunmuyor."
          );
        }

        const result =
          (await response.json()) as
            PagedResponse<AuditLog>;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ??
              "Denetim kayıtları yüklenemedi."
          );
        }

        setLogs(result.data);
        setPagination(
          result.pagination
        );
      } catch (caughtError) {
        if (
          caughtError instanceof Error &&
          caughtError.name ===
            "AbortError"
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoading(false);
      }
    }

    const timer =
      setTimeout(
        loadLogs,
        search ? 350 : 0
      );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    action,
    endDate,
    entityName,
    httpMethod,
    page,
    router,
    search,
    startDate,
  ]);

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  }

  function formatEntity(
    value: string
  ) {
    return value
      .replaceAll("_", " ")
      .replace(
        /([a-z])([A-Z])/g,
        "$1 $2"
      );
  }

  function getActionLabel(
    value: string
  ) {
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

  function clearFilters() {
    setSearch("");
    setEntityName("");
    setAction("");
    setHttpMethod("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Sistem Ayarları
            </span>

            <h1>
              Denetim kayıtları
            </h1>

            <p>
              Sistemde gerçekleştirilen
              kritik işlemleri ve değişiklik
              geçmişini inceleyin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/settings"
            >
              Ayarlara dön
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

        <section className="settings-navigation-grid">
          <Link
            className="settings-navigation-card"
            href="/settings"
          >
            <div className="settings-navigation-icon">
              ◈
            </div>

            <div>
              <strong>Roller</strong>

              <span>
                Kullanıcı rollerini yönetin.
              </span>
            </div>
          </Link>

          <Link
            className="settings-navigation-card"
            href="/settings/permissions"
          >
            <div className="settings-navigation-icon">
              ⛨
            </div>

            <div>
              <strong>Yetkiler</strong>

              <span>
                Erişim izinlerini yönetin.
              </span>
            </div>
          </Link>

          <Link
            className="settings-navigation-card active"
            href="/settings/audit-logs"
          >
            <div className="settings-navigation-icon">
              ≡
            </div>

            <div>
              <strong>
                Denetim kayıtları
              </strong>

              <span>
                Sistem geçmişini inceleyin.
              </span>
            </div>
          </Link>
        </section>

        <section className="audit-filter-panel">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Entity, kullanıcı, işlem veya endpoint ara..."
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value
                );

                setPage(1);
              }}
            />
          </div>

          <div className="audit-filter-grid">
            <input
              value={entityName}
              onChange={(event) => {
                setEntityName(
                  event.target.value
                );

                setPage(1);
              }}
              placeholder="Entity adı"
            />

            <select
              value={action}
              onChange={(event) => {
                setAction(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="">
                Tüm işlemler
              </option>

              <option value="CREATE">
                Oluşturma
              </option>

              <option value="UPDATE">
                Güncelleme
              </option>

              <option value="DELETE">
                Silme
              </option>

              <option value="STATUS_CHANGE">
                Durum değişikliği
              </option>

              <option value="ASSIGN">
                Atama
              </option>

              <option value="REMOVE">
                Kaldırma
              </option>
            </select>

            <select
              value={httpMethod}
              onChange={(event) => {
                setHttpMethod(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="">
                Tüm HTTP metotları
              </option>

              <option value="GET">
                GET
              </option>

              <option value="POST">
                POST
              </option>

              <option value="PUT">
                PUT
              </option>

              <option value="PATCH">
                PATCH
              </option>

              <option value="DELETE">
                DELETE
              </option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(
                  event.target.value
                );

                setPage(1);
              }}
            />

            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(
                  event.target.value
                );

                setPage(1);
              }}
            />

            <button
              type="button"
              onClick={clearFilters}
            >
              Filtreleri temizle
            </button>
          </div>
        </section>

        <section className="customer-table-panel">
          <div className="customer-table-header">
            <div>
              <h2>
                İşlem geçmişi
              </h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ??
                    0}
                </strong>{" "}
                kayıt
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />

              <p>
                Denetim kayıtları
                yükleniyor...
              </p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Kayıtlar yüklenemedi
              </strong>

              <p>{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                ≡
              </span>

              <strong>
                Denetim kaydı bulunamadı
              </strong>

              <p>
                Seçilen filtrelere uygun
                işlem kaydı bulunmuyor.
              </p>
            </div>
          ) : (
            <>
              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Tarih</th>
                      <th>Kullanıcı</th>
                      <th>İşlem</th>
                      <th>Varlık</th>
                      <th>HTTP</th>
                      <th>Endpoint</th>
                      <th>Değişen alanlar</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          {formatDate(
                            log.createdAt
                          )}
                        </td>

                        <td>
                          <div className="audit-user">
                            <strong>
                              {log.userDisplayName ??
                                "Sistem"}
                            </strong>

                            <span>
                              {log.ipAddress ??
                                "IP yok"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`audit-action audit-action-${log.action.toLowerCase()}`}
                          >
                            {getActionLabel(
                              log.action
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="audit-entity">
                            <strong>
                              {formatEntity(
                                log.entityName
                              )}
                            </strong>

                            <span>
                              {log.entityId}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`http-method http-${(
                              log.httpMethod ??
                              "GET"
                            ).toLowerCase()}`}
                          >
                            {log.httpMethod ??
                              "—"}
                          </span>
                        </td>

                        <td>
                          <code className="audit-path">
                            {log.requestPath ??
                              "—"}
                          </code>
                        </td>

                        <td>
                          <span className="audit-columns">
                            {log.changedColumns ??
                              "—"}
                          </span>
                        </td>

                        <td>
                          <Link
                            className="table-detail-link"
                            href={`/settings/audit-logs/${log.id}`}
                          >
                            Detay
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-bar">
                <span>
                  Sayfa{" "}
                  <strong>
                    {pagination?.page ?? 1}
                  </strong>{" "}
                  /{" "}
                  <strong>
                    {pagination?.totalPages ??
                      1}
                  </strong>
                </span>

                <div>
                  <button
                    type="button"
                    disabled={
                      !pagination?.hasPreviousPage
                    }
                    onClick={() =>
                      setPage((current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                      )
                    }
                  >
                    Önceki
                  </button>

                  <button
                    type="button"
                    disabled={
                      !pagination?.hasNextPage
                    }
                    onClick={() =>
                      setPage((current) =>
                        current + 1
                      )
                    }
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
