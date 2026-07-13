"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface Company {
  id: string;
  name: string;
  isActive: boolean;
}

interface Customer {
  id: string;
  companyId: string;
  company: {
    id: string;
    name: string;
    isActive: boolean;
  };
  name: string;
  code: string;
  customerType: string;
  contactName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  isActive: boolean;
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
  isActive: true,
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] =
    useState<Customer | null>(null);

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
        const [customerResponse, companyResponse] =
          await Promise.all([
            fetch(
              `${API_URL}/customers/${customerId}`,
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
          customerResponse.status === 401 ||
          companyResponse.status === 401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const customerResult =
          (await customerResponse.json()) as
            ApiResponse<Customer>;

        const companyResult =
          (await companyResponse.json()) as
            CompanyListResponse;

        if (
          !customerResponse.ok ||
          !customerResult.success ||
          !customerResult.data
        ) {
          throw new Error(
            customerResult.message ??
              "Müşteri bilgileri alınamadı."
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

        const loadedCustomer =
          customerResult.data;

        setCustomer(loadedCustomer);
        setCompanies(companyResult.data);

        setForm({
          companyId: loadedCustomer.companyId,
          name: loadedCustomer.name,
          code: loadedCustomer.code,
          customerType:
            loadedCustomer.customerType,
          contactName:
            loadedCustomer.contactName ?? "",
          phoneNumber:
            loadedCustomer.phoneNumber ?? "",
          email:
            loadedCustomer.email ?? "",
          taxNumber:
            loadedCustomer.taxNumber ?? "",
          city:
            loadedCustomer.city ?? "",
          district:
            loadedCustomer.district ?? "",
          address:
            loadedCustomer.address ?? "",
          latitude:
            loadedCustomer.latitude?.toString() ?? "",
          longitude:
            loadedCustomer.longitude?.toString() ?? "",
          notes:
            loadedCustomer.notes ?? "",
          isActive:
            loadedCustomer.isActive,
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
  }, [customerId, router]);

  function updateField(
    field: keyof typeof emptyForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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
        `${API_URL}/customers/${customerId}`,
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
              form.latitude
                ? Number(form.latitude)
                : null,
            longitude:
              form.longitude
                ? Number(form.longitude)
                : null,
            notes:
              form.notes.trim() || null,
            isActive: form.isActive,
          }),
        }
      );

      const result =
        (await response.json()) as
          ApiResponse<Customer>;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        const validationMessage =
          result.errors
            ? Object.values(result.errors)
                .flat()
                .join(" ")
            : null;

        throw new Error(
          validationMessage ||
            result.message ||
            "Müşteri güncellenemedi."
        );
      }

      const selectedCompany =
        companies.find(
          (company) =>
            company.id === result.data?.companyId
        );

      setCustomer({
        ...customer!,
        ...result.data,
        company: {
          id: result.data.companyId,
          name:
            selectedCompany?.name ??
            customer!.company.name,
          isActive:
            selectedCompany?.isActive ?? true,
        },
      });

      setMessage(
        result.message ??
          "Müşteri başarıyla güncellendi."
      );

      setIsEditing(false);
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
    const token =
      localStorage.getItem("saharut_access_token");

    if (!token || !customer) {
      router.replace("/");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setIsError(false);

      const newStatus =
        !customer.isActive;

      const response = await fetch(
        `${API_URL}/customers/${customerId}/status`,
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
          ApiResponse<{
            id: string;
            isActive: boolean;
          }>;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Müşteri durumu değiştirilemedi."
        );
      }

      setCustomer((current) =>
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
          "Müşteri durumu güncellendi."
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
        "Bu müşteriyi silmek istediğinizden emin misiniz?"
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
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/customers/${customerId}`,
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
            "Müşteri silinemedi."
        );
      }

      router.replace("/customers");
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

  function handleCancelEdit() {
    if (!customer) {
      return;
    }

    setForm({
      companyId: customer.companyId,
      name: customer.name,
      code: customer.code,
      customerType:
        customer.customerType,
      contactName:
        customer.contactName ?? "",
      phoneNumber:
        customer.phoneNumber ?? "",
      email:
        customer.email ?? "",
      taxNumber:
        customer.taxNumber ?? "",
      city:
        customer.city ?? "",
      district:
        customer.district ?? "",
      address:
        customer.address ?? "",
      latitude:
        customer.latitude?.toString() ?? "",
      longitude:
        customer.longitude?.toString() ?? "",
      notes:
        customer.notes ?? "",
      isActive:
        customer.isActive,
    });

    setIsEditing(false);
    setMessage("");
    setIsError(false);
  }

  function handleLogout() {
    localStorage.clear();
    router.replace("/");
  }

  if (isLoading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Müşteri bilgileri yükleniyor...</p>
      </main>
    );
  }

  if (!customer) {
    return (
      <main className="dashboard-error">
        <h1>Müşteri bulunamadı</h1>
        <p>{message}</p>

        <Link
          className="primary-link-button"
          href="/customers"
        >
          Müşteri listesine dön
        </Link>
      </main>
    );
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
              Müşteri Detayı
            </span>

            <h1>{customer.name}</h1>

            <p>
              {customer.code} · {customer.company.name}
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/customers"
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
                <div className="customer-profile-avatar">
                  {customer.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2>{customer.name}</h2>

                  <p>
                    {customer.customerType}
                  </p>

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
                </div>
              </div>

              <div className="customer-profile-actions">
                <button
                  className="status-action-button"
                  type="button"
                  onClick={handleStatusChange}
                  disabled={
                    isSaving ||
                    isDeleting
                  }
                >
                  {customer.isActive
                    ? "Pasif yap"
                    : "Aktif yap"}
                </button>

                <button
                  className="danger-action-button"
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    isDeleting ||
                    isSaving
                  }
                >
                  {isDeleting
                    ? "Siliniyor..."
                    : "Müşteriyi sil"}
                </button>
              </div>
            </section>

            <section className="detail-grid">
              <article className="detail-panel">
                <h2>Temel bilgiler</h2>

                <div className="detail-list">
                  <div>
                    <span>Müşteri kodu</span>
                    <strong>
                      {customer.code}
                    </strong>
                  </div>

                  <div>
                    <span>Firma</span>
                    <strong>
                      {customer.company.name}
                    </strong>
                  </div>

                  <div>
                    <span>Müşteri türü</span>
                    <strong>
                      {customer.customerType}
                    </strong>
                  </div>

                  <div>
                    <span>Vergi numarası</span>
                    <strong>
                      {customer.taxNumber ?? "—"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="detail-panel">
                <h2>İletişim</h2>

                <div className="detail-list">
                  <div>
                    <span>Yetkili kişi</span>
                    <strong>
                      {customer.contactName ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Telefon</span>
                    <strong>
                      {customer.phoneNumber ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>E-posta</span>
                    <strong>
                      {customer.email ?? "—"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="detail-panel">
                <h2>Adres</h2>

                <div className="detail-list">
                  <div>
                    <span>Şehir</span>
                    <strong>
                      {customer.city ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>İlçe</span>
                    <strong>
                      {customer.district ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Açık adres</span>
                    <strong>
                      {customer.address ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Koordinat</span>
                    <strong>
                      {customer.latitude != null &&
                      customer.longitude != null
                        ? `${customer.latitude}, ${customer.longitude}`
                        : "—"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="detail-panel">
                <h2>Notlar</h2>

                <p className="customer-notes">
                  {customer.notes ??
                    "Bu müşteri için not eklenmemiş."}
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
                  <h2>
                    Müşteri bilgilerini düzenle
                  </h2>

                  <p>
                    Değişiklikleri kaydetmeden önce
                    kontrol edin.
                  </p>
                </div>
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
                    disabled={isSaving}
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
                    disabled={isSaving}
                  />
                </div>

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
                    disabled={isSaving}
                  />
                </div>

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
                    disabled={isSaving}
                  />
                </div>

                <div className="form-field full">
                  <label htmlFor="address">
                    Adres
                  </label>

                  <textarea
                    id="address"
                    rows={4}
                    value={form.address}
                    onChange={(event) =>
                      updateField(
                        "address",
                        event.target.value
                      )
                    }
                    maxLength={1000}
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
                    disabled={isSaving}
                  />
                </div>

                <div className="form-field full">
                  <label htmlFor="notes">
                    Notlar
                  </label>

                  <textarea
                    id="notes"
                    rows={5}
                    value={form.notes}
                    onChange={(event) =>
                      updateField(
                        "notes",
                        event.target.value
                      )
                    }
                    maxLength={2000}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </section>

            <div className="form-actions">
              <button
                className="cancel-form-button"
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
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