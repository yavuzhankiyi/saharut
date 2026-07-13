"use client";

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
  customerType: "",
  contactName: "",
  phoneNumber: "",
  email: "",
  taxNumber: "",
  city: "",
  district: "",
  address: "",
  latitude: "",
  longitude: "",
  notes: "",
};

export default function NewCustomerPage() {
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
      !form.customerType.trim()
    ) {
      setIsError(true);
      setMessage(
        "Firma, müşteri adı, müşteri kodu ve müşteri türü zorunludur."
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
        `${API_URL}/customers`,
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
            customerType:
              form.customerType.trim(),
            contactName:
              form.contactName.trim() || null,
            phoneNumber:
              form.phoneNumber.trim() || null,
            email:
              form.email.trim() || null,
            taxNumber:
              form.taxNumber.trim() || null,
            city:
              form.city.trim() || null,
            district:
              form.district.trim() || null,
            address:
              form.address.trim() || null,
            latitude:
              form.latitude.trim()
                ? Number(form.latitude)
                : null,
            longitude:
              form.longitude.trim()
                ? Number(form.longitude)
                : null,
            notes:
              form.notes.trim() || null,
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
            "Müşteri oluşturulamadı."
        );
      }

      setMessage(
        result.message ??
          "Müşteri başarıyla oluşturuldu."
      );

      setTimeout(() => {
        router.push("/customers");
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
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">S</div>

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

            <h1>Yeni müşteri</h1>

            <p>
              Yeni müşteri kaydı oluşturun.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/customers"
            >
              Listeye dön
            </Link>

            <button
              className="logout-button"
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
                <h2>Temel bilgiler</h2>
                <p>
                  Müşterinin firma ve kimlik bilgileri
                </p>
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
                  Müşteri adı *
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
                  placeholder="Örn. ABC Market"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="code">
                  Müşteri kodu *
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
                  placeholder="Örn. CUS-001"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="customerType">
                  Müşteri türü *
                </label>

                <select
                  id="customerType"
                  value={form.customerType}
                  onChange={(event) =>
                    updateField(
                      "customerType",
                      event.target.value
                    )
                  }
                  disabled={isSaving}
                  required
                >
                  <option value="">
                    Tür seçin
                  </option>
                  <option value="Market">
                    Market
                  </option>
                  <option value="Bayi">
                    Bayi
                  </option>
                  <option value="Distribütör">
                    Distribütör
                  </option>
                  <option value="Perakende">
                    Perakende
                  </option>
                  <option value="Kurumsal">
                    Kurumsal
                  </option>
                  <option value="Diğer">
                    Diğer
                  </option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="taxNumber">
                  Vergi numarası
                </label>

                <input
                  id="taxNumber"
                  value={form.taxNumber}
                  onChange={(event) =>
                    updateField(
                      "taxNumber",
                      event.target.value
                    )
                  }
                  maxLength={50}
                  placeholder="Vergi numarası"
                  disabled={isSaving}
                />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>İletişim bilgileri</h2>
                <p>
                  Yetkili kişi ve iletişim detayları
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="contactName">
                  Yetkili kişi
                </label>

                <input
                  id="contactName"
                  value={form.contactName}
                  onChange={(event) =>
                    updateField(
                      "contactName",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="Ad soyad"
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="phoneNumber">
                  Telefon
                </label>

                <input
                  id="phoneNumber"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    updateField(
                      "phoneNumber",
                      event.target.value
                    )
                  }
                  maxLength={30}
                  placeholder="0555 111 22 33"
                  disabled={isSaving}
                />
              </div>

              <div className="form-field full">
                <label htmlFor="email">
                  E-posta
                </label>

                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="ornek@firma.com"
                  disabled={isSaving}
                />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>Adres ve konum</h2>
                <p>
                  Müşterinin saha ziyaret konumu
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="city">
                  Şehir
                </label>

                <input
                  id="city"
                  value={form.city}
                  onChange={(event) =>
                    updateField(
                      "city",
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="Sakarya"
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="district">
                  İlçe
                </label>

                <input
                  id="district"
                  value={form.district}
                  onChange={(event) =>
                    updateField(
                      "district",
                      event.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="Serdivan"
                  disabled={isSaving}
                />
              </div>

              <div className="form-field full">
                <label htmlFor="address">
                  Adres
                </label>

                <textarea
                  id="address"
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value
                    )
                  }
                  maxLength={1000}
                  rows={4}
                  placeholder="Açık adres"
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="latitude">
                  Enlem
                </label>

                <input
                  id="latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={form.latitude}
                  onChange={(event) =>
                    updateField(
                      "latitude",
                      event.target.value
                    )
                  }
                  placeholder="40.7569"
                  disabled={isSaving}
                />
              </div>

              <div className="form-field">
                <label htmlFor="longitude">
                  Boylam
                </label>

                <input
                  id="longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={form.longitude}
                  onChange={(event) =>
                    updateField(
                      "longitude",
                      event.target.value
                    )
                  }
                  placeholder="30.3781"
                  disabled={isSaving}
                />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>Notlar</h2>
                <p>
                  Müşteri hakkında ek açıklamalar
                </p>
              </div>
            </div>

            <div className="form-field full">
              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value
                  )
                }
                maxLength={2000}
                rows={5}
                placeholder="Müşteriyle ilgili notlar..."
                disabled={isSaving}
              />
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
              href="/customers"
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
                : "Müşteriyi kaydet"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
