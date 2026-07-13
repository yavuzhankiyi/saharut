"use client";

import AppSidebar from "@/app/components/AppSidebar";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface Company {
  id: string;
  name: string;
  isActive: boolean;
}

interface Product {
  id: string;
  companyId: string;
  company: Company;
  name: string;
  code: string;
  barcode?: string | null;
  description?: string | null;
  unit: string;
  listPrice: number;
  vatRate: number;
  stockQuantity: number;
  minimumStockQuantity: number;
  isActive: boolean;
  isLowStock: boolean;
  priceWithVat: number;
  createdAt: string;
  updatedAt?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
  errors?: Record<string, string[]>;
}

interface CompanyListResponse {
  success: boolean;
  data: Company[];
  message?: string | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  roles: string[];
}

const emptyForm = {
  companyId: "",
  name: "",
  code: "",
  barcode: "",
  description: "",
  unit: "",
  listPrice: "0",
  vatRate: "20",
  stockQuantity: "0",
  minimumStockQuantity: "0",
  isActive: true,
};

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const [product, setProduct] =
    useState<Product | null>(null);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [form, setForm] =
    useState(emptyForm);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isEditing, setIsEditing] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

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

    async function loadPage() {
      try {
        const [productResponse, companyResponse] =
          await Promise.all([
            fetch(
              `${API_URL}/products/${productId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),
            fetch(
              `${API_URL}/companies?page=1&pageSize=100&isActive=true`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),
          ]);

        if (
          productResponse.status === 401 ||
          companyResponse.status === 401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const productResult =
          (await productResponse.json()) as
            ApiResponse<Product>;

        const companyResult =
          (await companyResponse.json()) as
            CompanyListResponse;

        if (
          !productResponse.ok ||
          !productResult.success ||
          !productResult.data
        ) {
          throw new Error(
            productResult.message ??
              "Ürün bilgileri alınamadı."
          );
        }

        if (
          !companyResponse.ok ||
          !companyResult.success
        ) {
          throw new Error(
            companyResult.message ??
              "Firmalar alınamadı."
          );
        }

        const loadedProduct =
          productResult.data;

        setProduct(loadedProduct);
        setCompanies(companyResult.data);

        setForm({
          companyId: loadedProduct.companyId,
          name: loadedProduct.name,
          code: loadedProduct.code,
          barcode: loadedProduct.barcode ?? "",
          description:
            loadedProduct.description ?? "",
          unit: loadedProduct.unit,
          listPrice:
            loadedProduct.listPrice.toString(),
          vatRate:
            loadedProduct.vatRate.toString(),
          stockQuantity:
            loadedProduct.stockQuantity.toString(),
          minimumStockQuantity:
            loadedProduct.minimumStockQuantity.toString(),
          isActive: loadedProduct.isActive,
        });
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

    loadPage();
  }, [productId, router]);

  function updateField(
    field: keyof typeof emptyForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(value);
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const token =
      localStorage.getItem("saharut_access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `${API_URL}/products/${productId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            companyId: form.companyId,
            name: form.name.trim(),
            code: form.code.trim(),
            barcode:
              form.barcode.trim() || null,
            description:
              form.description.trim() || null,
            unit: form.unit.trim(),
            listPrice: Number(form.listPrice),
            vatRate: Number(form.vatRate),
            stockQuantity:
              Number(form.stockQuantity),
            minimumStockQuantity:
              Number(form.minimumStockQuantity),
            isActive: form.isActive,
          }),
        }
      );

      const result =
        (await response.json()) as
          ApiResponse<Partial<Product>>;

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
            "Ürün güncellenemedi."
        );
      }

      const selectedCompany =
        companies.find(
          (company) =>
            company.id === form.companyId
        );

      const updatedProduct: Product = {
        ...product!,
        ...result.data,
        companyId: form.companyId,
        company:
          selectedCompany ?? product!.company,
        name: form.name.trim(),
        code: form.code.trim(),
        barcode:
          form.barcode.trim() || null,
        description:
          form.description.trim() || null,
        unit: form.unit,
        listPrice: Number(form.listPrice),
        vatRate: Number(form.vatRate),
        stockQuantity:
          Number(form.stockQuantity),
        minimumStockQuantity:
          Number(form.minimumStockQuantity),
        isActive: form.isActive,
        isLowStock:
          Number(form.stockQuantity) <=
          Number(form.minimumStockQuantity),
        priceWithVat:
          Number(form.listPrice) *
          (1 + Number(form.vatRate) / 100),
      };

      setProduct(updatedProduct);
      setIsEditing(false);

      setMessage(
        result.message ??
          "Ürün başarıyla güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!product) {
      return;
    }

    const token =
      localStorage.getItem("saharut_access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setIsError(false);

      const newStatus =
        !product.isActive;

      const response = await fetch(
        `${API_URL}/products/${productId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            isActive: newStatus,
          }),
        }
      );

      const result =
        (await response.json()) as
          ApiResponse<object>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Ürün durumu değiştirilemedi."
        );
      }

      setProduct((current) =>
        current
          ? {
              ...current,
              isActive: newStatus,
            }
          : current
      );

      setForm((current) => ({
        ...current,
        isActive: newStatus,
      }));

      setMessage(
        result.message ??
          "Ürün durumu güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Bu ürünü silmek istediğinizden emin misiniz?"
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

      const response = await fetch(
        `${API_URL}/products/${productId}`,
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
            "Ürün silinemedi."
        );
      }

      router.replace("/products");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Beklenmeyen bir hata oluştu."
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
        <p>Ürün bilgileri yükleniyor...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="dashboard-error">
        <h1>Ürün bulunamadı</h1>
        <p>{message}</p>

        <Link
          className="primary-link-button"
          href="/products"
        >
          Ürün listesine dön
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
              Ürün Detayı
            </span>

            <h1>{product.name}</h1>

            <p>
              {product.code} · {product.company.name}
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/products"
            >
              Listeye dön
            </Link>

            {!isEditing && (
              <button
                className="primary-action-button"
                type="button"
                onClick={() =>
                  setIsEditing(true)
                }
              >
                Düzenle
              </button>
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

        {!isEditing ? (
          <>
            <section className="customer-profile-card">
              <div className="customer-profile-main">
                <div className="product-profile-avatar">
                  {product.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2>{product.name}</h2>
                  <p>{product.unit}</p>

                  <div className="product-badge-row">
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

                    {product.isLowStock && (
                      <span className="low-stock-badge">
                        Düşük stok
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="customer-profile-actions">
                <button
                  className="status-action-button"
                  type="button"
                  onClick={handleStatusChange}
                  disabled={isSaving}
                >
                  {product.isActive
                    ? "Pasif yap"
                    : "Aktif yap"}
                </button>

                <button
                  className="danger-action-button"
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? "Siliniyor..."
                    : "Ürünü sil"}
                </button>
              </div>
            </section>

            <section className="detail-grid">
              <article className="detail-panel">
                <h2>Ürün bilgileri</h2>

                <div className="detail-list">
                  <div>
                    <span>Ürün kodu</span>
                    <strong>{product.code}</strong>
                  </div>

                  <div>
                    <span>Barkod</span>
                    <strong>
                      {product.barcode ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Firma</span>
                    <strong>
                      {product.company.name}
                    </strong>
                  </div>

                  <div>
                    <span>Birim</span>
                    <strong>{product.unit}</strong>
                  </div>
                </div>
              </article>

              <article className="detail-panel">
                <h2>Fiyatlandırma</h2>

                <div className="detail-list">
                  <div>
                    <span>Liste fiyatı</span>
                    <strong>
                      {formatCurrency(
                        product.listPrice
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>KDV oranı</span>
                    <strong>
                      %{product.vatRate}
                    </strong>
                  </div>

                  <div>
                    <span>KDV dâhil fiyat</span>
                    <strong>
                      {formatCurrency(
                        product.priceWithVat
                      )}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="detail-panel">
                <h2>Stok bilgileri</h2>

                <div className="detail-list">
                  <div>
                    <span>Mevcut stok</span>
                    <strong>
                      {product.stockQuantity}
                    </strong>
                  </div>

                  <div>
                    <span>Minimum stok</span>
                    <strong>
                      {product.minimumStockQuantity}
                    </strong>
                  </div>

                  <div>
                    <span>Stok durumu</span>
                    <strong>
                      {product.isLowStock
                        ? "Düşük stok"
                        : "Stok yeterli"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="detail-panel">
                <h2>Açıklama</h2>

                <p className="customer-notes">
                  {product.description ??
                    "Bu ürün için açıklama eklenmemiş."}
                </p>
              </article>
            </section>
          </>
        ) : (
          <form
            className="customer-form"
            onSubmit={handleUpdate}
          >
            <section className="form-panel">
              <div className="form-panel-header">
                <div>
                  <h2>Ürün bilgilerini düzenle</h2>
                  <p>
                    Ürün, fiyat ve stok bilgilerini
                    güncelleyin.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field full">
                  <label>Firma *</label>

                  <select
                    value={form.companyId}
                    onChange={(event) =>
                      updateField(
                        "companyId",
                        event.target.value
                      )
                    }
                    required
                  >
                    {companies.map((company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Ürün adı *</label>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Ürün kodu *</label>

                  <input
                    value={form.code}
                    onChange={(event) =>
                      updateField(
                        "code",
                        event.target.value.toUpperCase()
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Barkod</label>

                  <input
                    value={form.barcode}
                    onChange={(event) =>
                      updateField(
                        "barcode",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Birim *</label>

                  <input
                    value={form.unit}
                    onChange={(event) =>
                      updateField(
                        "unit",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Liste fiyatı</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.listPrice}
                    onChange={(event) =>
                      updateField(
                        "listPrice",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label>KDV oranı</label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.vatRate}
                    onChange={(event) =>
                      updateField(
                        "vatRate",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Mevcut stok</label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.stockQuantity}
                    onChange={(event) =>
                      updateField(
                        "stockQuantity",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field">
                  <label>Minimum stok</label>

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={
                      form.minimumStockQuantity
                    }
                    onChange={(event) =>
                      updateField(
                        "minimumStockQuantity",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="form-field full">
                  <label>Açıklama</label>

                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            </section>

            <div className="form-actions">
              <button
                className="cancel-form-button"
                type="button"
                onClick={() =>
                  setIsEditing(false)
                }
              >
                Vazgeç
              </button>

              <button
                className="save-form-button"
                type="submit"
                disabled={isSaving}
              >
                {isSaving
                  ? "Kaydediliyor..."
                  : "Değişiklikleri kaydet"}
              </button>
            </div>
          </form>
        )}

        {message && (
          <div
            className={
              isError
                ? "customer-form-message error"
                : "customer-form-message success"
            }
          >
            {message}
          </div>
        )}
      </section>
    </main>
  );
}