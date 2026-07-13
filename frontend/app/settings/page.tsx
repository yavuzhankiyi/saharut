"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  "http://localhost:5062/api/v1";

interface Role {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  userCount: number;
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

export default function SettingsPage() {
  const router = useRouter();

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

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

    async function loadRoles() {
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
        "10"
      );

      query.set(
        "sortBy",
        "name"
      );

      query.set(
        "sortDirection",
        "asc"
      );

      if (search.trim()) {
        query.set(
          "search",
          search.trim()
        );
      }

      if (statusFilter !== "all") {
        query.set(
          "isActive",
          statusFilter
        );
      }

      try {
        const response = await fetch(
          `${API_URL}/roles?${query.toString()}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            signal:
              controller.signal,
          }
        );

        if (
          response.status === 401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const result =
          (await response.json()) as
            PagedResponse<Role>;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ??
              "Roller yüklenemedi."
          );
        }

        setRoles(result.data);

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
        loadRoles,
        search ? 350 : 0
      );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    page,
    router,
    search,
    statusFilter,
  ]);

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "medium",
      }
    ).format(new Date(value));
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

            <h1>Ayarlar</h1>

            <p>
              Rol, yetki ve sistem
              yönetimi işlemlerini
              gerçekleştirin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="primary-link-button"
              href="/settings/roles/new"
            >
              + Yeni rol
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
          <article className="settings-navigation-card active">
            <div className="settings-navigation-icon">
              ◈
            </div>

            <div>
              <strong>
                Roller
              </strong>

              <span>
                Kullanıcı rollerini ve
                durumlarını yönetin.
              </span>
            </div>
          </article>

          <article className="settings-navigation-card">
            <div className="settings-navigation-icon">
              ⛨
            </div>

            <div>
              <strong>
                Yetkiler
              </strong>

              <span>
                Rol bazlı erişim
                izinlerini inceleyin.
              </span>
            </div>
          </article>

          <article className="settings-navigation-card">
            <div className="settings-navigation-icon">
              ≡
            </div>

            <div>
              <strong>
                Denetim kayıtları
              </strong>

              <span>
                Sistem işlemlerinin
                geçmişini görüntüleyin.
              </span>
            </div>
          </article>
        </section>

        <section className="user-toolbar">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Rol adı, kodu veya açıklaması ara..."
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value
                );

                setPage(1);
              }}
            />
          </div>

          <div className="user-filters">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="all">
                Tüm roller
              </option>

              <option value="true">
                Aktif roller
              </option>

              <option value="false">
                Pasif roller
              </option>
            </select>
          </div>
        </section>

        <section className="customer-table-panel">
          <div className="customer-table-header">
            <div>
              <h2>
                Rol listesi
              </h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ??
                    0}
                </strong>{" "}
                rol
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />

              <p>
                Roller yükleniyor...
              </p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Roller yüklenemedi
              </strong>

              <p>{error}</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                ◈
              </span>

              <strong>
                Rol bulunamadı
              </strong>

              <p>
                Filtrelere uygun rol
                kaydı bulunmuyor.
              </p>

              <Link
                className="primary-link-button"
                href="/settings/roles/new"
              >
                İlk rolü oluştur
              </Link>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="role-table">
                  <thead>
                    <tr>
                      <th>Rol</th>
                      <th>Kod</th>
                      <th>Açıklama</th>
                      <th>Kullanıcı</th>
                      <th>Oluşturulma</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <div className="customer-name-cell">
                            <div className="role-avatar">
                              {role.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {role.name}
                              </strong>

                              <span>
                                Sistem rolü
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="role-code-badge">
                            {role.code}
                          </span>
                        </td>

                        <td>
                          <span className="role-description-text">
                            {role.description ??
                              "Açıklama yok"}
                          </span>
                        </td>

                        <td>
                          <div className="company-user-count">
                            <strong>
                              {role.userCount}
                            </strong>

                            <span>
                              kullanıcı
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="table-main-text">
                            {formatDate(
                              role.createdAt
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              role.isActive
                                ? "status-badge active"
                                : "status-badge passive"
                            }
                          >
                            {role.isActive
                              ? "Aktif"
                              : "Pasif"}
                          </span>
                        </td>

                        <td>
                          <Link
                            className="row-action"
                            href={`/settings/roles/${role.id}`}
                          >
                            Görüntüle
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
