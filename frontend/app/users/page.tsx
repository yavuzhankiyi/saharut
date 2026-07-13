"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface UserRole {
  id: string;
  name: string;
  code: string;
}

interface UserCompany {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  phoneNumberConfirmed: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  roles: UserRole[];
  companies: UserCompany[];
}

interface Company {
  id: string;
  name: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
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

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] =
    useState<UserItem[]>([]);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [companyFilter, setCompanyFilter] =
    useState("all");

  const [roleFilter, setRoleFilter] =
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

    async function loadFilters() {
      try {
        const [
          companyResponse,
          roleResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/companies?page=1&pageSize=100&isActive=true&sortBy=name&sortDirection=asc`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),

          fetch(
            `${API_URL}/roles?page=1&pageSize=100&isActive=true`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
        ]);

        if (companyResponse.ok) {
          const result =
            (await companyResponse.json()) as
              PagedResponse<Company>;

          if (result.success) {
            setCompanies(result.data);
          }
        }

        if (roleResponse.ok) {
          const result =
            (await roleResponse.json()) as
              PagedResponse<Role>;

          if (result.success) {
            setRoles(result.data);
          }
        }
      } catch {
        // Filtreler yüklenemese de kullanıcı listesi çalışmaya devam eder.
      }
    }

    loadFilters();
  }, [router]);

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

    async function loadUsers() {
      setIsLoading(true);
      setError("");

      const query =
        new URLSearchParams();

      query.set("page", page.toString());
      query.set("pageSize", "10");
      query.set("sortBy", "firstName");
      query.set("sortDirection", "asc");

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

      if (companyFilter !== "all") {
        query.set(
          "companyId",
          companyFilter
        );
      }

      if (roleFilter !== "all") {
        query.set(
          "roleId",
          roleFilter
        );
      }

      try {
        const response = await fetch(
          `${API_URL}/users?${query.toString()}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const result =
          (await response.json()) as
            PagedResponse<UserItem>;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ??
              "Kullanıcılar yüklenemedi."
          );
        }

        setUsers(result.data);
        setPagination(
          result.pagination
        );
      } catch (caughtError) {
        if (
          caughtError instanceof Error &&
          caughtError.name === "AbortError"
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
        loadUsers,
        search ? 350 : 0
      );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    companyFilter,
    page,
    roleFilter,
    router,
    search,
    statusFilter,
  ]);

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  function formatDate(
    value?: string | null
  ) {
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

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Kullanıcı Yönetimi
            </span>

            <h1>Kullanıcılar</h1>

            <p>
              Kullanıcıları, rollerini ve
              firma bağlantılarını yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="primary-link-button"
              href="/users/new"
            >
              + Yeni kullanıcı
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

        <section className="user-toolbar">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Ad, soyad, telefon veya e-posta ara..."
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
                Tüm durumlar
              </option>

              <option value="true">
                Aktif
              </option>

              <option value="false">
                Pasif
              </option>
            </select>

            <select
              value={companyFilter}
              onChange={(event) => {
                setCompanyFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="all">
                Tüm firmalar
              </option>

              {companies.map(
                (company) => (
                  <option
                    key={company.id}
                    value={company.id}
                  >
                    {company.name}
                  </option>
                )
              )}
            </select>

            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="all">
                Tüm roller
              </option>

              {roles.map((role) => (
                <option
                  key={role.id}
                  value={role.id}
                >
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="customer-table-panel">
          <div className="customer-table-header">
            <div>
              <h2>Kullanıcı listesi</h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ?? 0}
                </strong>{" "}
                kullanıcı
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />

              <p>
                Kullanıcılar yükleniyor...
              </p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Kullanıcılar yüklenemedi
              </strong>

              <p>{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                ◉
              </span>

              <strong>
                Kullanıcı bulunamadı
              </strong>

              <p>
                Filtrelere uygun kullanıcı
                kaydı bulunmuyor.
              </p>

              <Link
                className="primary-link-button"
                href="/users/new"
              >
                İlk kullanıcıyı oluştur
              </Link>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Kullanıcı</th>
                      <th>İletişim</th>
                      <th>Roller</th>
                      <th>Firmalar</th>
                      <th>Son giriş</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="customer-name-cell">
                            <div className="user-list-avatar">
                              {user.firstName.charAt(
                                0
                              )}
                              {user.lastName.charAt(
                                0
                              )}
                            </div>

                            <div>
                              <strong>
                                {user.firstName}{" "}
                                {user.lastName}
                              </strong>

                              <span>
                                {user.phoneNumberConfirmed
                                  ? "Telefon doğrulandı"
                                  : "Telefon doğrulanmadı"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="contact-cell">
                            <strong>
                              {user.phoneNumber}
                            </strong>

                            <span>
                              {user.email ??
                                "E-posta yok"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="user-tag-list">
                            {user.roles.length === 0 ? (
                              <span className="empty-tag">
                                Rol yok
                              </span>
                            ) : (
                              user.roles.map(
                                (role) => (
                                  <span
                                    className="user-role-tag"
                                    key={role.id}
                                  >
                                    {role.name}
                                  </span>
                                )
                              )
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="user-tag-list">
                            {user.companies.length === 0 ? (
                              <span className="empty-tag">
                                Firma yok
                              </span>
                            ) : (
                              user.companies.map(
                                (company) => (
                                  <span
                                    className="user-company-tag"
                                    key={company.id}
                                  >
                                    {company.name}
                                  </span>
                                )
                              )
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="table-main-text">
                            {formatDate(
                              user.lastLoginAt
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              user.isActive
                                ? "status-badge active"
                                : "status-badge passive"
                            }
                          >
                            {user.isActive
                              ? "Aktif"
                              : "Pasif"}
                          </span>
                        </td>

                        <td>
                          <Link
                            className="row-action"
                            href={`/users/${user.id}`}
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
                    {pagination?.totalPages ?? 1}
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
