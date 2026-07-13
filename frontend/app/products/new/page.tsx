"use client";

import AppSidebar from "@/app/components/AppSidebar";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface Company {
  id: string;
  name: string;
  isActive: boolean;
}

interface CompanyResponse {
  success: boolean;
  data: Company[];
  message?: string | null;
}

interface ApiResponse {
  success: boolean;
  message?: string | null;
  data?: {
    id: string;
  };
  errors?: Record<string, string[]>;
}

interface UserData {
  firstName: string;
  lastName: string;
  roles: string[];
}

const initialForm = {
  companyId: "",
  name: "",
  code: "",
  barcode: "",
  description: "",
  unit: "",
  listPrice: "",
  vatRate: "20",
  stockQuantity: "0",
  minimumStockQuantity: "0",
};

export default function NewProductPage() {
  const router = useRouter();

  const [form, setForm] =
    useState(initialForm);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [isLoadingCompanies, setIsLoadingCompanies] =
    useState(true);

  const [isSaving, setIsSaving] =
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

    async function loadCompanies() {
      try {
        const response = await fetch(
          `${API_URL}/companies?page=1&pageSize=100&isActive=true`,
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

        const result =
          (await response.json()) as CompanyResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Firmalar yüklenemedi."
          );
        }

        setCompanies(result.data);

        if (result.data.length === 1) {
          setForm((current) => ({
            ...current,
            companyId: result.data[0].id,
          }));
        }
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Firmalar yüklenemedi."
        );
      } finally {
        setIsLoadingCompanies(false);
      }
    }

    loadCompanies();
  }, [router]);

  function updateField(
    field: keyof typeof initialForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (
      !form.companyId ||
      !form.name.trim() ||
      !form.code.trim() ||
      !form.unit.trim()
    ) {
      setIsError(true);
      setMessage(
        "Firma, ürün adı, ürün kodu ve birim zorunludur."
      );
      return;
    }

    const listPrice =
      Number(form.listPrice);

    const vatRate =
      Number(form.vatRate);

    const stockQuantity =
      Number(form.stockQuantity);

    const minimumStockQuantity =
      Number(form.minimumStockQuantity);

    if (
      Number.isNaN(listPrice) ||
      listPrice < 0
    ) {
      setIsError(true);
      setMessage(
        "Liste fiyatı sıfırdan küçük olamaz."
      );
      return;
    }

    if (
      Number.isNaN(vatRate) ||
      vatRate < 0 ||
      vatRate > 100
    ) {
      setIsError(true);
      setMessage(
        "KDV oranı 0 ile 100 arasında olmalıdır."
      );
      return;
    }

    if (
      Number.isNaN(stockQuantity) ||
      stockQuantity < 0 ||
      Number.isNaN(minimumStockQuantity) ||
      minimumStockQuantity < 0
    ) {
      setIsError(true);
      setMessage(
        "Stok değerleri sıfırdan küçük olamaz."
      );
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

      const response = await fetch(
        `${API_URL}/products`,
        {
          method: "POST",
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
            listPrice,
            vatRate,
            stockQuantity,
            minimumStockQuantity,
          }),
        }
      );

      const result =
        (await response.json()) as ApiResponse;

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
            "Ürün oluşturulamadı."
        );
      }

      setMessage(
        result.message ??
          "Ürün başarıyla oluşturuldu."
      );

      setTimeout(() => {
        router.push("/products");
      }, 800);
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
              Ürün Yönetimi
            </span>

            <h1>Yeni ürün</h1>

            <p>
              Yeni ürün kaydı ve başlangıç stok
              bilgilerini oluşturun.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/products"
            >
              Listeye dön
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

        <form
          className="customer-form"
          onSubmit={handleSubmit}
        >
          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>Temel ürün bilgileri</h2>
                <p>Firma, ürün adı ve ürün kodu</p>
              </div>

              <span>Zorunlu alanlar *</span>
            </div>

            <div className="form-grid">
              <div className="form-field full">
                <label htmlFor="companyId">
                  Firma *
                </label>

                <select
                  id="companyId"
                  value={form.companyId}
                  onChange={(event) =>
                    updateField(
                      "companyId",
                      event.target.value
                    )
                  }
                  disabled={
                    isLoadingCompanies ||
                    isSaving
                  }
                  required
                >
                  <option value="">
                    {isLoadingCompanies
                      ? "Firmalar yükleniyor..."
                      : "Firma seçin"}
                  </option>

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
                <label htmlFor="name">
                  Ürün adı *
                </label>

                <input
                  id="name"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="Örn. Premium Kahve"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="code">
                  Ürün kodu *
                </label>

                <input
                  id="code"
                  value={form.code}
                  onChange={(event) =>
                    updateField(
                      "code",
                      event.target.value
                        .toUpperCase()
                    )
                  }
                  maxLength={100}
                  placeholder="Örn. PRD-001"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="barcode">
                  Barkod
                </label>

                <input
                  id="barcode"
                  value={form.barcode}
                  onChange={(event) =>
                    updateField(
                      "barcode",
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="8690000000001"
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="unit">
                  Birim *
                </label>

                <select
                  id="unit"
                  value={form.unit}
                  onChange={(event) =>
                    updateField(
                      "unit",
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                  required
                >
                  <option value="">
                    Birim seçin
                  </option>

                  <option value="Adet">
                    Adet
                  </option>

                  <option value="Kutu">
                    Kutu
                  </option>

                  <option value="Koli">
                    Koli
                  </option>

                  <option value="Paket">
                    Paket
                  </option>

                  <option value="Kilogram">
                    Kilogram
                  </option>

                  <option value="Litre">
                    Litre
                  </option>

                  <option value="Metre">
                    Metre
                  </option>
                </select>
              </div>

              <div className="form-field full">
                <label htmlFor="description">
                  Açıklama
                </label>

                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  maxLength={1000}
                  rows={4}
                  placeholder="Ürün hakkında açıklama..."
                  disabled={isSaving}
                />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>Fiyatlandırma</h2>
                <p>Liste fiyatı ve KDV oranı</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="listPrice">
                  Liste fiyatı *
                </label>

                <div className="number-field">
                  <input
                    id="listPrice"
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
                    placeholder="0,00"
                    disabled={isSaving}
                    required
                  />

                  <span>₺</span>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="vatRate">
                  KDV oranı
                </label>

                <div className="number-field">
                  <input
                    id="vatRate"
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
                    disabled={isSaving}
                  />

                  <span>%</span>
                </div>
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>Stok bilgileri</h2>
                <p>Mevcut stok ve uyarı seviyesi</p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="stockQuantity">
                  Başlangıç stoğu
                </label>

                <input
                  id="stockQuantity"
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
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="minimumStockQuantity">
                  Minimum stok
                </label>

                <input
                  id="minimumStockQuantity"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.minimumStockQuantity}
                  onChange={(event) =>
                    updateField(
                      "minimumStockQuantity",
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="stock-help-box">
              <span>!</span>

              <p>
                Mevcut stok minimum stok seviyesine
                eşit veya daha düşük olduğunda ürün
                düşük stok olarak işaretlenir.
              </p>
            </div>
          </section>

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

          <div className="form-actions">
            <Link
              className="cancel-form-button"
              href="/products"
            >
              İptal
            </Link>

            <button
              className="save-form-button"
              type="submit"
              disabled={
                isSaving ||
                isLoadingCompanies
              }
            >
              {isSaving
                ? "Kaydediliyor..."
                : "Ürünü kaydet"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
