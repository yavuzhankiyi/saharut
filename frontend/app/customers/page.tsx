"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface Customer {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  code: string;
  customerType: string;
  contactName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  city?: string | null;
  district?: string | null;
  isActive: boolean;
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

interface CustomerResponse {
  success: boolean;
  data: Customer[];
  pagination: Pagination;
  message?: string | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  roles: string[];
}

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [search, setSearch] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState("all");

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

    async function loadCustomers() {
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

      if (activeFilter !== "all") {
        query.set(
          "isActive",
          activeFilter
        );
      }

      try {
        const response = await fetch(
          `${API_URL}/customers?${query.toString()}`,
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
          (await response.json()) as CustomerResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Müşteriler alınamadı."
          );
        }

        setCustomers(result.data);
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
        loadCustomers,
        search ? 350 : 0
      );

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    activeFilter,
    page,
    router,
    search,
  ]);

  function handleLogout() {
    localStorage.removeItem(
      "saharut_access_token"
    );

    localStorage.removeItem(
      "saharut_token_expires_at"
    );

    localStorage.removeItem(
      "saharut_user"
    );

    router.replace("/");
  }

  return (
    <main className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            S
          </div>

          <div>
            <strong>Saharut</strong>
            <span>Operasyon Platformu</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link href="/dashboard">
            <span>⌂</span>
            Dashboard
          </Link>

          <a href="#">
            <span>▣</span>
            Firmalar
          </a>

          <Link
            className="active"
            href="/customers"
          >
            <span>♙</span>
            Müşteriler
          </Link>

          <a href="#">
            <span>□</span>
            Ürünler
          </a>

          <a href="#">
            <span>◇</span>
            Ziyaretler
          </a>

          <a href="#">
            <span>◉</span>
            Kullanıcılar
          </a>

          <a href="#">
            <span>⚙</span>
            Ayarlar
          </a>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>

          <div>
            <strong>
              {user
                ? `${user.firstName} ${user.lastName}`
                : "Kullanıcı"}
            </strong>

            <span>
              {user?.roles?.[0] ??
                "Kullanıcı"}
            </span>
          </div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Müşteri Yönetimi
            </span>

            <h1>Müşteriler</h1>

            <p>
              Firma müşterilerini görüntüleyin,
              arayın ve yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="primary-link-button"
              href="/customers/new"
            >
              + Yeni müşteri
            </Link>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Çıkış yap
            </button>
          </div>
        </header>

        <section className="customer-toolbar">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Müşteri adı, kodu veya telefon ara..."
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
            value={activeFilter}
            onChange={(event) => {
              setActiveFilter(
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
        </section>

        <section className="customer-table-panel">
          <div className="customer-table-header">
            <div>
              <h2>Müşteri listesi</h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ?? 0}
                </strong>{" "}
                müşteri
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />
              <p>Müşteriler yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Müşteriler yüklenemedi
              </strong>

              <p>{error}</p>

              <button
                onClick={() =>
                  location.reload()
                }
              >
                Tekrar dene
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                ♙
              </span>

              <strong>
                Müşteri bulunamadı
              </strong>

              <p>
                Arama ölçütlerinize uygun
                müşteri bulunmuyor.
              </p>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="customer-table">
                  <thead>
                    <tr>
                      <th>Müşteri</th>
                      <th>Firma</th>
                      <th>Tür</th>
                      <th>İletişim</th>
                      <th>Konum</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {customers.map(
                      (customer) => (
                        <tr key={customer.id}>
                          <td>
                            <div className="customer-name-cell">
                              <div className="customer-avatar">
                                {customer.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {customer.name}
                                </strong>

                                <span>
                                  {customer.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="table-main-text">
                              {customer.companyName}
                            </span>
                          </td>

                          <td>
                            <span className="customer-type">
                              {customer.customerType}
                            </span>
                          </td>

                          <td>
                            <div className="contact-cell">
                              <strong>
                                {customer.contactName ??
                                  "—"}
                              </strong>

                              <span>
                                {customer.phoneNumber ??
                                  customer.email ??
                                  "İletişim bilgisi yok"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="location-cell">
                              <strong>
                                {customer.city ??
                                  "—"}
                              </strong>

                              <span>
                                {customer.district ??
                                  ""}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                customer.isActive
                                  ? "status-badge active"
                                  : "status-badge passive"
                              }
                            >
                              {customer.isActive
                                ? "Aktif"
                                : "Pasif"}
                            </span>
                          </td>

                          <td>
                            <Link
                              className="row-action"
                              href={`/customers/${customer.id}`}
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
