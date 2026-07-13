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

const protectedRoleCodes = new Set([
  "SUPER_ADMIN",
  "OPERATIONS_MANAGER",
  "MANUFACTURER_MANAGER",
  "DISTRIBUTOR_MANAGER",
  "FIELD_SALES",
  "FINANCE_MANAGER",
]);

interface RoleUser {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isActive: boolean;
}

interface RoleDetail {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  userCount: number;
  users: RoleUser[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
  errors?: Record<string, string[]>;
}

const initialForm = {
  name: "",
  code: "",
  description: "",
  isActive: true,
};

export default function RoleDetailPage() {
  const router = useRouter();

  const params =
    useParams<{ id: string }>();

  const roleId = params.id;

  const [role, setRole] =
    useState<RoleDetail | null>(null);

  const [form, setForm] =
    useState(initialForm);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isEditing, setIsEditing] =
    useState(false);

  const [isProcessing, setIsProcessing] =
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

    async function loadRole() {
      try {
        const response = await fetch(
          `${API_URL}/roles/${roleId}`,
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
            ApiResponse<RoleDetail>;

        if (
          !response.ok ||
          !result.success ||
          !result.data
        ) {
          throw new Error(
            result.message ??
              "Rol bilgileri alınamadı."
          );
        }

        setRole(result.data);

        setForm({
          name: result.data.name,
          code: result.data.code,
          description:
            result.data.description ?? "",
          isActive:
            result.data.isActive,
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

    loadRole();
  }, [
    roleId,
    router,
  ]);

  function normalizeCode(
    value: string
  ) {
    return value
      .toLocaleUpperCase("tr-TR")
      .replace(/İ/g, "I")
      .replace(/Ş/g, "S")
      .replace(/Ğ/g, "G")
      .replace(/Ü/g, "U")
      .replace(/Ö/g, "O")
      .replace(/Ç/g, "C")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

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
    if (!role) {
      return;
    }

    setForm({
      name: role.name,
      code: role.code,
      description:
        role.description ?? "",
      isActive:
        role.isActive,
    });

    setIsEditing(false);
    setMessage("");
    setIsError(false);
  }

  async function parseResponse<T>(
    response: Response
  ) {
    const result =
      (await response.json()) as
        ApiResponse<T>;

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
          "İşlem tamamlanamadı."
      );
    }

    return result;
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const name =
      form.name.trim();

    const code =
      normalizeCode(form.code);

    if (!name || !code) {
      setIsError(true);

      setMessage(
        "Rol adı ve rol kodu zorunludur."
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
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/roles/${roleId}`,
        {
          method: "PUT",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            name,
            code,
            description:
              form.description.trim() ||
              null,
            isActive:
              form.isActive,
          }),
        }
      );

      const result =
        await parseResponse<
          Partial<RoleDetail>
        >(response);

      setRole((current) =>
        current
          ? {
              ...current,
              ...result.data,
              name,
              code,
              description:
                form.description.trim() ||
                null,
              isActive:
                form.isActive,
            }
          : current
      );

      setIsEditing(false);

      setMessage(
        result.message ??
          "Rol başarıyla güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Rol güncellenemedi."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStatusChange() {
    if (!role) {
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
      !role.isActive;

    try {
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/roles/${roleId}/status`,
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
        await parseResponse<object>(
          response
        );

      setRole((current) =>
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
          "Rol durumu güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Rol durumu değiştirilemedi."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Bu rolü silmek istediğinizden emin misiniz?"
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
        `${API_URL}/roles/${roleId}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      await parseResponse<object>(
        response
      );

      router.replace("/settings");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Rol silinemedi."
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
          Rol bilgileri yükleniyor...
        </p>
      </main>
    );
  }

  if (!role) {
    return (
      <main className="dashboard-error">
        <h1>Rol bulunamadı</h1>

        <p>{message}</p>

        <Link
          className="primary-link-button"
          href="/settings"
        >
          Rol listesine dön
        </Link>
      </main>
    );
  }

  const isProtected =
    protectedRoleCodes.has(
      role.code
    );

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Rol Yönetimi
            </span>

            <h1>{role.name}</h1>

            <p>
              Rol bilgilerini ve bağlı
              kullanıcıları yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/settings"
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
            <section className="role-profile-card">
              <div className="role-profile-main">
                <div className="role-profile-avatar">
                  {role.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <h2>{role.name}</h2>

                  <span className="role-code-badge">
                    {role.code}
                  </span>

                  <div className="role-profile-badges">
                    <span
                      className={
                        role.isActive
                          ? "status-badge active"
                          : "status-badge passive"
                      }
                    >
                      {role.isActive
                        ? "Aktif"
                        : "Pasif"}
                    </span>

                    {isProtected && (
                      <span className="protected-role-badge">
                        Sistem rolü
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="company-profile-actions">
                <button
                  className="status-action-button"
                  type="button"
                  onClick={
                    handleStatusChange
                  }
                  disabled={
                    isProcessing ||
                    isProtected
                  }
                >
                  {role.isActive
                    ? "Pasif yap"
                    : "Aktif yap"}
                </button>

                <button
                  className="danger-action-button"
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    isDeleting ||
                    isProtected ||
                    role.userCount > 0
                  }
                >
                  {isDeleting
                    ? "Siliniyor..."
                    : "Rolü sil"}
                </button>
              </div>
            </section>

            <section className="role-summary-grid">
              <article className="company-stat-card">
                <span>
                  Bağlı kullanıcı
                </span>

                <strong>
                  {role.userCount}
                </strong>

                <p>
                  Bu role atanmış toplam
                  kullanıcı sayısı
                </p>
              </article>

              <article className="company-stat-card">
                <span>
                  Rol durumu
                </span>

                <strong>
                  {role.isActive
                    ? "Aktif"
                    : "Pasif"}
                </strong>

                <p>
                  Kullanıcılara atanabilme
                  durumu
                </p>
              </article>

              <article className="company-stat-card">
                <span>Rol tipi</span>

                <strong>
                  {isProtected
                    ? "Sistem"
                    : "Özel"}
                </strong>

                <p>
                  Rolün koruma ve yönetim
                  seviyesi
                </p>
              </article>
            </section>

            <section className="detail-grid">
              <article className="detail-panel">
                <h2>Rol bilgileri</h2>

                <div className="detail-list">
                  <div>
                    <span>Rol adı</span>

                    <strong>
                      {role.name}
                    </strong>
                  </div>

                  <div>
                    <span>Rol kodu</span>

                    <strong>
                      {role.code}
                    </strong>
                  </div>

                  <div>
                    <span>Açıklama</span>

                    <strong>
                      {role.description ??
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
                        role.createdAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Son güncelleme
                    </span>

                    <strong>
                      {formatDate(
                        role.updatedAt
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
                    Role bağlı kullanıcılar
                  </h2>

                  <p>
                    Toplam{" "}
                    <strong>
                      {role.users.length}
                    </strong>{" "}
                    kullanıcı
                  </p>
                </div>
              </div>

              {role.users.length === 0 ? (
                <div className="table-state">
                  <span className="empty-customer-icon">
                    ◈
                  </span>

                  <strong>
                    Bağlı kullanıcı yok
                  </strong>

                  <p>
                    Bu rol henüz hiçbir
                    kullanıcıya atanmamış.
                  </p>
                </div>
              ) : (
                <div className="company-user-grid">
                  {role.users.map(
                    (user) => (
                      <Link
                        className="role-user-card"
                        href={`/users/${user.id}`}
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
                            {user.phoneNumber}
                          </span>
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
                      </Link>
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
                    Rol bilgilerini düzenle
                  </h2>

                  <p>
                    Rol adı, kodu, açıklaması
                    ve durumunu güncelleyin.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>
                    Rol adı *
                  </label>

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
                  <label>
                    Rol kodu *
                  </label>

                  <input
                    value={form.code}
                    onChange={(event) =>
                      updateField(
                        "code",
                        normalizeCode(
                          event.target.value
                        )
                      )
                    }
                    disabled={isProtected}
                    required
                  />

                  {isProtected && (
                    <span>
                      Sistem rollerinin kodu
                      değiştirilemez.
                    </span>
                  )}
                </div>

                <div className="form-field full">
                  <label>Açıklama</label>

                  <textarea
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value
                      )
                    }
                    rows={5}
                  />
                </div>

                <div className="form-field full">
                  <label>Rol durumu</label>

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
                    disabled={isProtected}
                  >
                    <option value="true">
                      Aktif
                    </option>

                    <option value="false">
                      Pasif
                    </option>
                  </select>

                  <span>
                    Aktif kullanıcılara
                    atanmış rol pasif
                    yapılamaz.
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
                disabled={isProcessing}
              >
                {isProcessing
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