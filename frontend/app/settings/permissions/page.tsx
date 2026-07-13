"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  "http://localhost:5062/api/v1";

interface Permission {
  id: string;
  name: string;
  code: string;
  module: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  roleCount: number;
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

export default function PermissionsPage() {
  const router = useRouter();

  const [permissions, setPermissions] =
    useState<Permission[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [search, setSearch] =
    useState("");

  const [moduleFilter, setModuleFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] =
    useState(1);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const modules = useMemo(() => {
    return Array.from(
      new Set(
        permissions.map(
          (permission) =>
            permission.module
        )
      )
    ).sort();
  }, [permissions]);

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

    async function loadPermissions() {
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
        "12"
      );

      query.set(
        "sortBy",
        "module"
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

      if (moduleFilter !== "all") {
        query.set(
          "module",
          moduleFilter
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
          `${API_URL}/permissions?${query.toString()}`,
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
            "Bu sayfayı görüntülemek için SUPER_ADMIN yetkisi gerekiyor."
          );
        }

        const result =
          (await response.json()) as
            PagedResponse<Permission>;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ??
              "Yetkiler yüklenemedi."
          );
        }

        setPermissions(result.data);

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
        loadPermissions,
        search ? 350 : 0
      );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    moduleFilter,
    page,
    router,
    search,
    statusFilter,
  ]);

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  function formatModule(
    value: string
  ) {
    return value
      .replaceAll("_", " ")
      .toLocaleLowerCase("tr-TR")
      .replace(
        /(^|\s)\S/g,
        (letter) =>
          letter.toLocaleUpperCase(
            "tr-TR"
          )
      );
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

            <h1>Yetkiler</h1>

            <p>
              Modül bazlı sistem yetkilerini
              ve rol bağlantılarını yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/settings"
            >
              Ayarlara dön
            </Link>

            <Link
              className="primary-link-button"
              href="/settings/permissions/new"
            >
              + Yeni yetki
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
            className="settings-navigation-card active"
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
            className="settings-navigation-card"
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

        <section className="user-toolbar">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Yetki adı, kodu, modülü veya açıklaması ara..."
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
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="all">
                Tüm modüller
              </option>

              {modules.map((module) => (
                <option
                  key={module}
                  value={module}
                >
                  {formatModule(module)}
                </option>
              ))}
            </select>

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
                Tüm durumlar
              </option>

              <option value="true">
                Aktif
              </option>

              <option value="false">
                Pasif
              </option>
            </select>
          </div>
        </section>

        <section className="customer-table-panel">
          <div className="customer-table-header">
            <div>
              <h2>Yetki listesi</h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ??
                    0}
                </strong>{" "}
                yetki
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />

              <p>
                Yetkiler yükleniyor...
              </p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Yetkiler yüklenemedi
              </strong>

              <p>{error}</p>
            </div>
          ) : permissions.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                ⛨
              </span>

              <strong>
                Yetki bulunamadı
              </strong>

              <p>
                Filtrelere uygun yetki kaydı
                bulunmuyor.
              </p>
            </div>
          ) : (
            <>
              <div className="permission-grid">
                {permissions.map(
                  (permission) => (
                    <Link
                      className="permission-card"
                      href={`/settings/permissions/${permission.id}`}
                      key={permission.id}
                    >
                      <div className="permission-card-top">
                        <div className="permission-icon">
                          ⛨
                        </div>

                        <span
                          className={
                            permission.isActive
                              ? "status-badge active"
                              : "status-badge passive"
                          }
                        >
                          {permission.isActive
                            ? "Aktif"
                            : "Pasif"}
                        </span>
                      </div>

                      <div className="permission-card-body">
                        <span className="permission-module">
                          {formatModule(
                            permission.module
                          )}
                        </span>

                        <h3>
                          {permission.name}
                        </h3>

                        <code>
                          {permission.code}
                        </code>

                        <p>
                          {permission.description ??
                            "Bu yetki için açıklama bulunmuyor."}
                        </p>
                      </div>

                      <div className="permission-card-footer">
                        <span>
                          <strong>
                            {
                              permission.roleCount
                            }
                          </strong>{" "}
                          role atanmış
                        </span>

                        <span>
                          Görüntüle →
                        </span>
                      </div>
                    </Link>
                  )
                )}
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
