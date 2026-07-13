"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface Company {
  id: string;
  name: string;
  taxNumber?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  activeUserCount: number;
  totalUserCount: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface CompanyResponse {
  success: boolean;
  data: Company[];
  pagination: Pagination;
  message?: string | null;
}

export default function CompaniesPage() {
  const router = useRouter();

  const [companies, setCompanies] =
    useState<Company[]>([]);

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

    async function loadCompanies() {
      setIsLoading(true);
      setError("");

      const query =
        new URLSearchParams();

      query.set("page", page.toString());
      query.set("pageSize", "10");
      query.set("sortBy", "name");
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

      try {
        const response = await fetch(
          `${API_URL}/companies?${query.toString()}`,
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
            CompanyResponse;

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ??
              "Firmalar yüklenemedi."
          );
        }

        setCompanies(result.data);
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
        loadCompanies,
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
              Firma Yönetimi
            </span>

            <h1>Firmalar</h1>

            <p>
              Sistemdeki firmaları,
              kullanıcı sayılarını ve
              iletişim bilgilerini yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="primary-link-button"
              href="/companies/new"
            >
              + Yeni firma
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

        <section className="company-toolbar">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Firma, vergi numarası, telefon veya e-posta ara..."
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value
                );

                setPage(1);
              }}
            />
          </div>

          <select
            className="company-status-filter"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );

              setPage(1);
            }}
          >
            <option value="all">
              Tüm firmalar
            </option>

            <option value="true">
              Aktif firmalar
            </option>

            <option value="false">
              Pasif firmalar
            </option>
          </select>
        </section>

        <section className="customer-table-panel">
          <div className="customer-table-header">
            <div>
              <h2>Firma listesi</h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ?? 0}
                </strong>{" "}
                firma
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />

              <p>
                Firmalar yükleniyor...
              </p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Firmalar yüklenemedi
              </strong>

              <p>{error}</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                ▣
              </span>

              <strong>
                Firma bulunamadı
              </strong>

              <p>
                Filtrelere uygun firma
                kaydı bulunmuyor.
              </p>

              <Link
                className="primary-link-button"
                href="/companies/new"
              >
                İlk firmayı oluştur
              </Link>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="company-table">
                  <thead>
                    <tr>
                      <th>Firma</th>
                      <th>Vergi numarası</th>
                      <th>İletişim</th>
                      <th>Kullanıcılar</th>
                      <th>Oluşturulma</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {companies.map(
                      (company) => (
                        <tr key={company.id}>
                          <td>
                            <div className="customer-name-cell">
                              <div className="company-avatar">
                                {company.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {company.name}
                                </strong>

                                <span>
                                  Firma kaydı
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="table-main-text">
                              {company.taxNumber ??
                                "—"}
                            </span>
                          </td>

                          <td>
                            <div className="contact-cell">
                              <strong>
                                {company.phoneNumber ??
                                  "—"}
                              </strong>

                              <span>
                                {company.email ??
                                  "E-posta yok"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="company-user-count">
                              <strong>
                                {
                                  company.activeUserCount
                                }
                              </strong>

                              <span>
                                aktif /{" "}
                                {
                                  company.totalUserCount
                                }{" "}
                                toplam
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="table-main-text">
                              {formatDate(
                                company.createdAt
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                company.isActive
                                  ? "status-badge active"
                                  : "status-badge passive"
                              }
                            >
                              {company.isActive
                                ? "Aktif"
                                : "Pasif"}
                            </span>
                          </td>

                          <td>
                            <Link
                              className="row-action"
                              href={`/companies/${company.id}`}
                            >
                              Görüntüle
                            </Link>
                          </td>
                        </tr>
                      )
                    )}
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
