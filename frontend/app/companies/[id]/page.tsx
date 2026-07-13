"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

const API_URL =
  "http://localhost:5062/api/v1";

interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  email?: string | null;
  isActive: boolean;
}

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
  users: CompanyUser[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
  errors?: Record<string, string[]>;
}

const initialForm = {
  name: "",
  taxNumber: "",
  phoneNumber: "",
  email: "",
  isActive: true,
};

export default function CompanyDetailPage() {
  const router = useRouter();

  const params =
    useParams<{ id: string }>();

  const companyId = params.id;

  const [company, setCompany] =
    useState<Company | null>(null);

  const [form, setForm] =
    useState(initialForm);

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
      localStorage.getItem(
        "saharut_access_token"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    async function loadCompany() {
      try {
        const response = await fetch(
          `${API_URL}/companies/${companyId}`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const result =
          (await response.json()) as
            ApiResponse<Company>;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ??
              "Firma bilgileri alınamadı."
          );
        }

        const loadedCompany =
          result.data;

        setCompany(loadedCompany);

        setForm({
          name: loadedCompany.name,
          taxNumber:
            loadedCompany.taxNumber ?? "",
          phoneNumber:
            loadedCompany.phoneNumber ?? "",
          email:
            loadedCompany.email ?? "",
          isActive:
            loadedCompany.isActive,
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

    loadCompany();
  }, [
    companyId,
    router,
  ]);

  function updateField(
    field: keyof typeof initialForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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

  function resetForm() {
    if (!company) {
      return;
    }

    setForm({
      name: company.name,
      taxNumber:
        company.taxNumber ?? "",
      phoneNumber:
        company.phoneNumber ?? "",
      email:
        company.email ?? "",
      isActive:
        company.isActive,
    });

    setIsEditing(false);
    setMessage("");
    setIsError(false);
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const companyName =
      form.name.trim();

    if (companyName.length < 2) {
      setIsError(true);

      setMessage(
        "Firma adı en az 2 karakter olmalıdır."
      );

      return;
    }

    const token =
      localStorage.getItem(
        "saharut_access_token"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `${API_URL}/companies/${companyId}`,
        {
          method: "PUT",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            name: companyName,
            taxNumber:
              form.taxNumber.trim() ||
              null,
            phoneNumber:
              form.phoneNumber.trim() ||
              null,
            email:
              form.email.trim() ||
              null,
            isActive:
              form.isActive,
          }),
        }
      );

      const result =
        (await response.json()) as
          ApiResponse<Partial<Company>>;

      if (
        !response.ok ||
        !result.success
      ) {
        const validationMessage =
          result.errors
            ? Object.values(
                result.errors
              )
                .flat()
                .join(" ")
            : null;

        throw new Error(
          validationMessage ||
            result.message ||
            "Firma güncellenemedi."
        );
      }

      setCompany((current) =>
        current
          ? {
              ...current,
              ...result.data,
              name: companyName,
              taxNumber:
                form.taxNumber.trim() ||
                null,
              phoneNumber:
                form.phoneNumber.trim() ||
                null,
              email:
                form.email.trim() ||
                null,
              isActive:
                form.isActive,
            }
          : current
      );

      setIsEditing(false);

      setMessage(
        result.message ??
          "Firma başarıyla güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Firma güncellenemedi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange() {
    if (!company) {
      return;
    }

    const token =
      localStorage.getItem(
        "saharut_access_token"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    const newStatus =
      !company.isActive;

    try {
      setIsSaving(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/companies/${companyId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization:
              `Bearer ${token}`,
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

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Firma durumu değiştirilemedi."
        );
      }

      setCompany((current) =>
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
          "Firma durumu güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Firma durumu değiştirilemedi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Bu firmayı silmek istediğinizden emin misiniz?"
      );

    if (!confirmed) {
      return;
    }

    const token =
      localStorage.getItem(
        "saharut_access_token"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      setIsDeleting(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/companies/${companyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        (await response.json()) as
          ApiResponse<object>;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Firma silinemedi."
        );
      }

      router.replace("/companies");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Firma silinemedi."
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

        <p>
          Firma bilgileri yükleniyor...
        </p>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="dashboard-error">
        <h1>Firma bulunamadı</h1>

        <p>{message}</p>

        <Link
          className="primary-link-button"
          href="/companies"
        >
          Firma listesine dön
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
              Firma Detayı
            </span>

            <h1>{company.name}</h1>

            <p>
              Firma bilgilerini ve bağlı
              kullanıcıları yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/companies"
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
            <section className="company-profile-card">
              <div className="company-profile-main">
                <div className="company-profile-avatar">
                  {company.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2>{company.name}</h2>

                  <p>
                    {company.taxNumber
                      ? `Vergi No: ${company.taxNumber}`
                      : "Vergi numarası girilmemiş"}
                  </p>

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
                </div>
              </div>

              <div className="company-profile-actions">
                <button
                  className="status-action-button"
                  type="button"
                  onClick={handleStatusChange}
                  disabled={isSaving}
                >
                  {company.isActive
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
                    : "Firmayı sil"}
                </button>
              </div>
            </section>

            <section className="company-summary-grid">
              <article className="company-stat-card">
                <span>Aktif kullanıcı</span>

                <strong>
                  {company.activeUserCount}
                </strong>

                <p>
                  Firmada aktif çalışan
                  kullanıcı sayısı
                </p>
              </article>

              <article className="company-stat-card">
                <span>
                  Toplam kullanıcı
                </span>

                <strong>
                  {company.users.length}
                </strong>

                <p>
                  Firmaya bağlı toplam
                  kullanıcı sayısı
                </p>
              </article>

              <article className="company-stat-card">
                <span>
                  Firma durumu
                </span>

                <strong>
                  {company.isActive
                    ? "Aktif"
                    : "Pasif"}
                </strong>

                <p>
                  Sistemde işlem yapabilme
                  durumu
                </p>
              </article>
            </section>

            <section className="detail-grid">
              <article className="detail-panel">
                <h2>Firma bilgileri</h2>

                <div className="detail-list">
                  <div>
                    <span>Firma adı</span>

                    <strong>
                      {company.name}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Vergi numarası
                    </span>

                    <strong>
                      {company.taxNumber ??
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Telefon</span>

                    <strong>
                      {company.phoneNumber ??
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>E-posta</span>

                    <strong>
                      {company.email ??
                        "—"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="detail-panel">
                <h2>Kayıt bilgileri</h2>

                <div className="detail-list">
                  <div>
                    <span>Oluşturulma</span>

                    <strong>
                      {formatDate(
                        company.createdAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Son güncelleme
                    </span>

                    <strong>
                      {formatDate(
                        company.updatedAt
                      )}
                    </strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="company-users-panel">
              <div className="customer-table-header">
                <div>
                  <h2>
                    Firma kullanıcıları
                  </h2>

                  <p>
                    Bu firmaya bağlı{" "}
                    <strong>
                      {company.users.length}
                    </strong>{" "}
                    kullanıcı
                  </p>
                </div>
              </div>

              {company.users.length === 0 ? (
                <div className="table-state">
                  <span className="empty-customer-icon">
                    ◉
                  </span>

                  <strong>
                    Bağlı kullanıcı yok
                  </strong>

                  <p>
                    Bu firmaya henüz kullanıcı
                    atanmamış.
                  </p>
                </div>
              ) : (
                <div className="company-user-grid">
                  {company.users.map(
                    (user) => (
                      <article
                        className="company-user-card"
                        key={user.id}
                      >
                        <div className="company-user-avatar">
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
                            {user.email ??
                              "E-posta yok"}
                          </span>

                          <small>
                            {user.phoneNumber ??
                              "Telefon yok"}
                          </small>
                        </div>

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
                      </article>
                    )
                  )}
                </div>
              )}
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
                    Firma bilgilerini düzenle
                  </h2>

                  <p>
                    Kimlik, iletişim ve durum
                    bilgilerini güncelleyin.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field full">
                  <label>
                    Firma adı *
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    minLength={2}
                    maxLength={200}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>
                    Vergi numarası
                  </label>

                  <input
                    value={
                      form.taxNumber
                    }
                    onChange={(event) =>
                      updateField(
                        "taxNumber",
                        event.target.value
                      )
                    }
                    maxLength={20}
                  />
                </div>

                <div className="form-field">
                  <label>Telefon</label>

                  <input
                    type="tel"
                    value={
                      form.phoneNumber
                    }
                    onChange={(event) =>
                      updateField(
                        "phoneNumber",
                        event.target.value
                      )
                    }
                    maxLength={30}
                  />
                </div>

                <div className="form-field full">
                  <label>E-posta</label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                    maxLength={200}
                  />
                </div>

                <div className="form-field full">
                  <label>
                    Firma durumu
                  </label>

                  <select
                    value={
                      form.isActive
                        ? "true"
                        : "false"
                    }
                    onChange={(event) =>
                      updateField(
                        "isActive",
                        event.target.value ===
                          "true"
                      )
                    }
                  >
                    <option value="true">
                      Aktif
                    </option>

                    <option value="false">
                      Pasif
                    </option>
                  </select>

                  <span>
                    Aktif kullanıcılara sahip
                    firma pasif yapılamaz.
                  </span>
                </div>
              </div>
            </section>

            <div className="form-actions">
              <button
                className="cancel-form-button"
                type="button"
                onClick={resetForm}
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