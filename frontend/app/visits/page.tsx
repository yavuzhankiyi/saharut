"use client";

import AppSidebar from "@/app/components/AppSidebar";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface Visit {
  id: string;
  companyId: string;
  companyName: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  assignedUserId: string;
  assignedUserName: string;
  title: string;
  purpose?: string | null;
  plannedStartAt: string;
  plannedEndAt: string;
  status: number;
  statusName: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface VisitResponse {
  success: boolean;
  data: Visit[];
  pagination: Pagination;
  message?: string | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  roles: string[];
}

const statusOptions = [
  { value: "all", label: "Tüm durumlar" },
  { value: "0", label: "Planlandı" },
  { value: "1", label: "Devam ediyor" },
  { value: "2", label: "Tamamlandı" },
  { value: "3", label: "İptal edildi" },
  { value: "4", label: "Kaçırıldı" },
];

export default function VisitsPage() {
  const router = useRouter();

  const [visits, setVisits] =
    useState<Visit[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [plannedFrom, setPlannedFrom] =
    useState("");

  const [plannedTo, setPlannedTo] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const storedUser =
      localStorage.getItem("saharut_user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("saharut_user");
      }
    }
  }, []);

  useEffect(() => {
    const token =
      localStorage.getItem("saharut_access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    const controller =
      new AbortController();

    async function loadVisits() {
      setIsLoading(true);
      setError("");

      const query =
        new URLSearchParams();

      query.set("page", page.toString());
      query.set("pageSize", "10");
      query.set("sortBy", "plannedStartAt");
      query.set("sortDirection", "desc");

      if (search.trim()) {
        query.set("search", search.trim());
      }

      if (statusFilter !== "all") {
        query.set("status", statusFilter);
      }

      if (plannedFrom) {
        query.set(
          "plannedFrom",
          new Date(plannedFrom).toISOString()
        );
      }

      if (plannedTo) {
        const endOfDay =
          new Date(plannedTo);

        endOfDay.setHours(
          23,
          59,
          59,
          999
        );

        query.set(
          "plannedTo",
          endOfDay.toISOString()
        );
      }

      try {
        const response = await fetch(
          `${API_URL}/visits?${query.toString()}`,
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
          (await response.json()) as VisitResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Ziyaretler alınamadı."
          );
        }

        setVisits(result.data);
        setPagination(result.pagination);
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
        loadVisits,
        search ? 350 : 0
      );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    page,
    plannedFrom,
    plannedTo,
    router,
    search,
    statusFilter,
  ]);

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
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

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Ziyaret Yönetimi
            </span>

            <h1>Ziyaretler</h1>

            <p>
              Planlanan ve tamamlanan saha
              ziyaretlerini yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="primary-link-button"
              href="/visits/new"
            >
              + Yeni ziyaret
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

        <section className="visit-toolbar">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Başlık, müşteri veya kullanıcı ara..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="visit-filters">
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              {statusOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            <input
              type="date"
              value={plannedFrom}
              onChange={(event) => {
                setPlannedFrom(
                  event.target.value
                );

                setPage(1);
              }}
            />

            <input
              type="date"
              value={plannedTo}
              onChange={(event) => {
                setPlannedTo(
                  event.target.value
                );

                setPage(1);
              }}
            />
          </div>
        </section>

        <section className="customer-table-panel">
          <div className="customer-table-header">
            <div>
              <h2>Ziyaret listesi</h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ?? 0}
                </strong>{" "}
                ziyaret
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />
              <p>Ziyaretler yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Ziyaretler yüklenemedi
              </strong>

              <p>{error}</p>
            </div>
          ) : visits.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                ◇
              </span>

              <strong>
                Ziyaret bulunamadı
              </strong>

              <p>
                Filtrelere uygun ziyaret kaydı
                bulunmuyor.
              </p>

              <Link
                className="primary-link-button"
                href="/visits/new"
              >
                İlk ziyareti planla
              </Link>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="visit-table">
                  <thead>
                    <tr>
                      <th>Ziyaret</th>
                      <th>Müşteri</th>
                      <th>Atanan kullanıcı</th>
                      <th>Başlangıç</th>
                      <th>Bitiş</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {visits.map((visit) => (
                      <tr key={visit.id}>
                        <td>
                          <div className="customer-name-cell">
                            <div className="visit-avatar">
                              ◇
                            </div>

                            <div>
                              <strong>
                                {visit.title}
                              </strong>

                              <span>
                                {visit.companyName}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="contact-cell">
                            <strong>
                              {visit.customerName}
                            </strong>

                            <span>
                              {visit.customerCode}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="table-main-text">
                            {
                              visit.assignedUserName
                            }
                          </span>
                        </td>

                        <td>
                          <span className="visit-date-text">
                            {formatDate(
                              visit.plannedStartAt
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="visit-date-text">
                            {formatDate(
                              visit.plannedEndAt
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`visit-status-badge ${getStatusClass(
                              visit.statusName
                            )}`}
                          >
                            {getStatusLabel(
                              visit.statusName
                            )}
                          </span>
                        </td>

                        <td>
                          <Link
                            className="row-action"
                            href={`/visits/${visit.id}`}
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
