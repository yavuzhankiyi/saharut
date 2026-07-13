"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

const API_URL =
  "http://localhost:5062/api/v1";

interface Role {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface PermissionDetail {
  id: string;
  name: string;
  code: string;
  module: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
  roles: Role[];
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
  errors?: Record<string, string[]>;
}

interface PagedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  message?: string | null;
}

const initialForm = {
  name: "",
  code: "",
  module: "",
  description: "",
  isActive: true,
};

export default function PermissionDetailPage() {
  const router = useRouter();

  const params =
    useParams<{ id: string }>();

  const permissionId =
    params.id;

  const [
    permission,
    setPermission,
  ] = useState<PermissionDetail | null>(
    null
  );

  const [allRoles, setAllRoles] =
    useState<Role[]>([]);

  const [selectedRoleId, setSelectedRoleId] =
    useState("");

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

  const availableRoles =
    useMemo(() => {
      if (!permission) {
        return allRoles;
      }

      const assignedRoleIds =
        new Set(
          permission.roles.map(
            (role) => role.id
          )
        );

      return allRoles.filter(
        (role) =>
          role.isActive &&
          !assignedRoleIds.has(
            role.id
          )
      );
    }, [
      allRoles,
      permission,
    ]);

  useEffect(() => {
    const token =
      localStorage.getItem(
        "saharut_access_token"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    async function loadData() {
      try {
        const [
          permissionResponse,
          rolesResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/permissions/${permissionId}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),

          fetch(
            `${API_URL}/roles?page=1&pageSize=100&sortBy=name&sortDirection=asc`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
        ]);

        if (
          permissionResponse.status ===
          401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        if (
          permissionResponse.status ===
          403
        ) {
          throw new Error(
            "Bu sayfayı görüntülemek için SUPER_ADMIN rolü gerekiyor."
          );
        }

        const permissionResult =
          (await permissionResponse.json()) as
            ApiResponse<PermissionDetail>;

        if (
          !permissionResponse.ok ||
          !permissionResult.success ||
          !permissionResult.data
        ) {
          throw new Error(
            permissionResult.message ??
              "Yetki bilgileri alınamadı."
          );
        }

        setPermission(
          permissionResult.data
        );

        setForm({
          name:
            permissionResult.data.name,
          code:
            permissionResult.data.code,
          module:
            permissionResult.data.module,
          description:
            permissionResult.data
              .description ?? "",
          isActive:
            permissionResult.data
              .isActive,
        });

        if (rolesResponse.ok) {
          const rolesResult =
            (await rolesResponse.json()) as
              PagedResponse<Role>;

          if (rolesResult.success) {
            setAllRoles(
              rolesResult.data
            );
          }
        }
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

    loadData();
  }, [
    permissionId,
    router,
  ]);

  function normalizeValue(
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
      .replace(/[^A-Z0-9.]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeModule(
    value: string
  ) {
    return normalizeValue(
      value
    ).replaceAll(".", "_");
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
    if (!permission) {
      return;
    }

    setForm({
      name:
        permission.name,
      code:
        permission.code,
      module:
        permission.module,
      description:
        permission.description ?? "",
      isActive:
        permission.isActive,
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
      normalizeValue(form.code);

    const module =
      normalizeModule(form.module);

    if (
      !name ||
      !code ||
      !module
    ) {
      setIsError(true);

      setMessage(
        "Yetki adı, kodu ve modülü zorunludur."
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
        `${API_URL}/permissions/${permissionId}`,
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
            module,
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
          Partial<PermissionDetail>
        >(response);

      setPermission((current) =>
        current
          ? {
              ...current,
              ...result.data,
              name,
              code,
              module,
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
          "Yetki başarıyla güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Yetki güncellenemedi."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStatusChange() {
    if (!permission) {
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
      !permission.isActive;

    try {
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/permissions/${permissionId}/status`,
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

      setPermission((current) =>
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
          "Yetki durumu güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Yetki durumu değiştirilemedi."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAssignRole() {
    if (!selectedRoleId) {
      setIsError(true);

      setMessage(
        "Bir rol seçin."
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
        `${API_URL}/roles/${selectedRoleId}/permissions/${permissionId}`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await parseResponse<{
          roleId: string;
          roleName: string;
          roleCode: string;
        }>(response);

      const selectedRole =
        allRoles.find(
          (role) =>
            role.id === selectedRoleId
        );

      if (selectedRole) {
        setPermission((current) =>
          current
            ? {
                ...current,
                roles: [
                  ...current.roles,
                  selectedRole,
                ],
              }
            : current
        );
      }

      setSelectedRoleId("");

      setMessage(
        result.message ??
          "Yetki role başarıyla atandı."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Yetki role atanamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRemoveRole(
    role: Role
  ) {
    const confirmed =
      window.confirm(
        `${role.name} rolünden bu yetkiyi kaldırmak istediğinizden emin misiniz?`
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
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/roles/${role.id}/permissions/${permissionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const result =
        await parseResponse<object>(
          response
        );

      setPermission((current) =>
        current
          ? {
              ...current,
              roles:
                current.roles.filter(
                  (item) =>
                    item.id !== role.id
                ),
            }
          : current
      );

      setMessage(
        result.message ??
          "Yetki rol üzerinden kaldırıldı."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Rol bağlantısı kaldırılamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Bu yetkiyi silmek istediğinizden emin misiniz?"
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
        `${API_URL}/permissions/${permissionId}`,
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

      router.replace(
        "/settings/permissions"
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Yetki silinemedi."
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
          Yetki bilgileri yükleniyor...
        </p>
      </main>
    );
  }

  if (!permission) {
    return (
      <main className="dashboard-error">
        <h1>Yetki bulunamadı</h1>

        <p>{message}</p>

        <Link
          className="primary-link-button"
          href="/settings/permissions"
        >
          Yetki listesine dön
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
              Yetki Yönetimi
            </span>

            <h1>{permission.name}</h1>

            <p>
              Yetki bilgilerini ve bağlı
              rolleri yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/settings/permissions"
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
            <section className="permission-profile-card">
              <div className="permission-profile-main">
                <div className="permission-profile-icon">
                  ⛨
                </div>

                <div>
                  <span className="permission-module">
                    {permission.module}
                  </span>

                  <h2>
                    {permission.name}
                  </h2>

                  <code>
                    {permission.code}
                  </code>

                  <div className="role-profile-badges">
                    <span
                      className={
                        permission.isActive
                          ? "status-badge active"
                          : "status-badge passive"
                      }
                    >
                      {permission.isActive
                        ? "Aktif"
                        : "Pasif"}
                    </span>
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
                    isProcessing
                  }
                >
                  {permission.isActive
                    ? "Pasif yap"
                    : "Aktif yap"}
                </button>

                <button
                  className="danger-action-button"
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    isDeleting ||
                    permission.roles.length >
                      0
                  }
                >
                  {isDeleting
                    ? "Siliniyor..."
                    : "Yetkiyi sil"}
                </button>
              </div>
            </section>

            <section className="role-summary-grid">
              <article className="company-stat-card">
                <span>
                  Bağlı rol
                </span>

                <strong>
                  {permission.roles.length}
                </strong>

                <p>
                  Bu yetkiye bağlı toplam
                  rol sayısı
                </p>
              </article>

              <article className="company-stat-card">
                <span>
                  Yetki durumu
                </span>

                <strong>
                  {permission.isActive
                    ? "Aktif"
                    : "Pasif"}
                </strong>

                <p>
                  Rollere atanabilme durumu
                </p>
              </article>

              <article className="company-stat-card">
                <span>Modül</span>

                <strong>
                  {permission.module}
                </strong>

                <p>
                  Yetkinin bağlı olduğu
                  sistem modülü
                </p>
              </article>
            </section>

            <section className="detail-grid">
              <article className="detail-panel">
                <h2>
                  Yetki bilgileri
                </h2>

                <div className="detail-list">
                  <div>
                    <span>Yetki adı</span>

                    <strong>
                      {permission.name}
                    </strong>
                  </div>

                  <div>
                    <span>Yetki kodu</span>

                    <strong>
                      {permission.code}
                    </strong>
                  </div>

                  <div>
                    <span>Modül</span>

                    <strong>
                      {permission.module}
                    </strong>
                  </div>

                  <div>
                    <span>Açıklama</span>

                    <strong>
                      {permission.description ??
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
                        permission.createdAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Son güncelleme
                    </span>

                    <strong>
                      {formatDate(
                        permission.updatedAt
                      )}
                    </strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="permission-role-panel">
              <div className="customer-table-header">
                <div>
                  <h2>Bağlı roller</h2>

                  <p>
                    Yetkiyi kullanan roller
                  </p>
                </div>
              </div>

              <div className="permission-role-add">
                <select
                  value={selectedRoleId}
                  onChange={(event) =>
                    setSelectedRoleId(
                      event.target.value
                    )
                  }
                  disabled={
                    isProcessing ||
                    !permission.isActive
                  }
                >
                  <option value="">
                    Rol seçin
                  </option>

                  {availableRoles.map(
                    (role) => (
                      <option
                        key={role.id}
                        value={role.id}
                      >
                        {role.name}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={
                    handleAssignRole
                  }
                  disabled={
                    isProcessing ||
                    !selectedRoleId ||
                    !permission.isActive
                  }
                >
                  Role ata
                </button>
              </div>

              <div className="permission-role-list">
                {permission.roles.length ===
                0 ? (
                  <p className="assignment-empty">
                    Bu yetki henüz hiçbir
                    role atanmamış.
                  </p>
                ) : (
                  permission.roles.map(
                    (role) => (
                      <article
                        className="permission-role-card"
                        key={role.id}
                      >
                        <div>
                          <strong>
                            {role.name}
                          </strong>

                          <span>
                            {role.code}
                          </span>
                        </div>

                        <div>
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

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveRole(
                                role
                              )
                            }
                            disabled={
                              isProcessing
                            }
                          >
                            Kaldır
                          </button>
                        </div>
                      </article>
                    )
                  )
                )}
              </div>
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
                    Yetki bilgilerini düzenle
                  </h2>

                  <p>
                    Ad, kod, modül, açıklama
                    ve durum bilgilerini
                    güncelleyin.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>
                    Yetki adı *
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
                  <label>Modül *</label>

                  <input
                    value={form.module}
                    onChange={(event) =>
                      updateField(
                        "module",
                        normalizeModule(
                          event.target.value
                        )
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field full">
                  <label>
                    Yetki kodu *
                  </label>

                  <input
                    value={form.code}
                    onChange={(event) =>
                      updateField(
                        "code",
                        normalizeValue(
                          event.target.value
                        )
                      )
                    }
                    required
                  />
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
                  <label>
                    Yetki durumu
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
                    Aktif rollere atanmış
                    yetki pasif yapılamaz.
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