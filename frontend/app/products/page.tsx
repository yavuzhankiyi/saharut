"use client";

import AppSidebar from "@/app/components/AppSidebar";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface Product {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  code: string;
  barcode?: string | null;
  unit: string;
  listPrice: number;
  vatRate: number;
  stockQuantity: number;
  minimumStockQuantity: number;
  isActive: boolean;
  isLowStock: boolean;
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

interface ProductResponse {
  success: boolean;
  data: Product[];
  pagination: Pagination;
  message?: string | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  roles: string[];
}

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [pagination, setPagination] =
    useState<Pagination | null>(null);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [stockFilter, setStockFilter] =
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

    async function loadProducts() {
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

      if (stockFilter !== "all") {
        query.set(
          "isLowStock",
          stockFilter
        );
      }

      try {
        const response = await fetch(
          `${API_URL}/products?${query.toString()}`,
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
          (await response.json()) as ProductResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Ürünler alınamadı."
          );
        }

        setProducts(result.data);
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
        loadProducts,
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
    stockFilter,
  ]);

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat(
      "tr-TR",
      {
        style: "currency",
        currency: "TRY",
      }
    ).format(value);
  }

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Ürün Yönetimi
            </span>

            <h1>Ürünler</h1>

            <p>
              Ürün kataloğunu, fiyatları ve
              stok durumlarını yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="primary-link-button"
              href="/products/new"
            >
              + Yeni ürün
            </Link>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Çıkış yap
            </button>
          </div>
        </header>

        <section className="product-toolbar">
          <div className="customer-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Ürün adı, kodu veya barkod ara..."
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value
                );

                setPage(1);
              }}
            />
          </div>

          <div className="product-filters">
            <select
              value={stockFilter}
              onChange={(event) => {
                setStockFilter(
                  event.target.value
                );

                setPage(1);
              }}
            >
              <option value="all">
                Tüm stoklar
              </option>

              <option value="true">
                Düşük stok
              </option>

              <option value="false">
                Stok yeterli
              </option>
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
              <h2>Ürün listesi</h2>

              <p>
                Toplam{" "}
                <strong>
                  {pagination?.totalCount ?? 0}
                </strong>{" "}
                ürün
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="table-state">
              <div className="table-spinner" />
              <p>Ürünler yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="table-state error-state">
              <strong>
                Ürünler yüklenemedi
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
          ) : products.length === 0 ? (
            <div className="table-state">
              <span className="empty-customer-icon">
                □
              </span>

              <strong>
                Ürün bulunamadı
              </strong>

              <p>
                Henüz ürün eklenmemiş veya filtrelere
                uygun kayıt bulunmuyor.
              </p>

              <Link
                className="primary-link-button"
                href="/products/new"
              >
                İlk ürünü ekle
              </Link>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Firma</th>
                      <th>Birim</th>
                      <th>Fiyat</th>
                      <th>KDV</th>
                      <th>Stok</th>
                      <th>Durum</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {products.map(
                      (product) => (
                        <tr key={product.id}>
                          <td>
                            <div className="customer-name-cell">
                              <div className="product-avatar">
                                {product.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {product.name}
                                </strong>

                                <span>
                                  {product.code}
                                  {product.barcode
                                    ? ` · ${product.barcode}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="table-main-text">
                              {product.companyName}
                            </span>
                          </td>

                          <td>
                            <span className="customer-type">
                              {product.unit}
                            </span>
                          </td>

                          <td>
                            <strong className="product-price">
                              {formatCurrency(
                                product.listPrice
                              )}
                            </strong>
                          </td>

                          <td>
                            <span className="table-main-text">
                              %{product.vatRate}
                            </span>
                          </td>

                          <td>
                            <div className="stock-cell">
                              <strong>
                                {product.stockQuantity}
                              </strong>

                              <span>
                                Min.{" "}
                                {
                                  product.minimumStockQuantity
                                }
                              </span>

                              {product.isLowStock && (
                                <small>
                                  Düşük stok
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                product.isActive
                                  ? "status-badge active"
                                  : "status-badge passive"
                              }
                            >
                              {product.isActive
                                ? "Aktif"
                                : "Pasif"}
                            </span>
                          </td>

                          <td>
                            <Link
                              className="row-action"
                              href={`/products/${product.id}`}
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
