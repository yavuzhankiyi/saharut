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
  isActive?: boolean;
}

interface Company {
  id: string;
  name: string;
  isActive?: boolean;
}

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string | null;
  phoneNumberConfirmed: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  roles: Role[];
  companies: Company[];
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
  message?: string | null;
}

interface StoredUser {
  id?: string;
  firstName?: string;
  lastName?: string;
}

const initialForm = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  isActive: true,
};

export default function UserDetailPage() {
  const router = useRouter();

  const params =
    useParams<{ id: string }>();

  const userId = params.id;

  const [user, setUser] =
    useState<UserDetail | null>(null);

  const [form, setForm] =
    useState(initialForm);

  const [allRoles, setAllRoles] =
    useState<Role[]>([]);

  const [allCompanies, setAllCompanies] =
    useState<Company[]>([]);

  const [selectedRoleId, setSelectedRoleId] =
    useState("");

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] = useState("");

  const [currentUserId, setCurrentUserId] =
    useState("");

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
      if (!user) {
        return allRoles;
      }

      const assignedIds =
        new Set(
          user.roles.map(
            (role) => role.id
          )
        );

      return allRoles.filter(
        (role) =>
          !assignedIds.has(role.id)
      );
    }, [allRoles, user]);

  const availableCompanies =
    useMemo(() => {
      if (!user) {
        return allCompanies;
      }

      const assignedIds =
        new Set(
          user.companies.map(
            (company) => company.id
          )
        );

      return allCompanies.filter(
        (company) =>
          !assignedIds.has(company.id)
      );
    }, [allCompanies, user]);

  useEffect(() => {
    const token =
      localStorage.getItem(
        "saharut_access_token"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    const storedUser =
      localStorage.getItem(
        "saharut_user"
      );

    if (storedUser) {
      try {
        const parsedUser =
          JSON.parse(
            storedUser
          ) as StoredUser;

        setCurrentUserId(
          parsedUser.id ?? ""
        );
      } catch {
        localStorage.removeItem(
          "saharut_user"
        );
      }
    }

    async function loadData() {
      try {
        const [
          userResponse,
          roleResponse,
          companyResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/users/${userId}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),

          fetch(
            `${API_URL}/roles?page=1&pageSize=100&isActive=true`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),

          fetch(
            `${API_URL}/companies?page=1&pageSize=100&isActive=true&sortBy=name&sortDirection=asc`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
        ]);

        if (
          userResponse.status === 401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const userResult =
          (await userResponse.json()) as
            ApiResponse<UserDetail>;

        if (
          !userResponse.ok ||
          !userResult.success ||
          !userResult.data
        ) {
          throw new Error(
            userResult.message ??
              "Kullanıcı bilgileri alınamadı."
          );
        }

        const loadedUser =
          userResult.data;

        setUser(loadedUser);

        setForm({
          firstName:
            loadedUser.firstName,
          lastName:
            loadedUser.lastName,
          phoneNumber:
            loadedUser.phoneNumber,
          email:
            loadedUser.email ?? "",
          isActive:
            loadedUser.isActive,
        });

        if (roleResponse.ok) {
          const roleResult =
            (await roleResponse.json()) as
              PagedResponse<Role>;

          if (roleResult.success) {
            setAllRoles(
              roleResult.data
            );
          }
        }

        if (companyResponse.ok) {
          const companyResult =
            (await companyResponse.json()) as
              PagedResponse<Company>;

          if (companyResult.success) {
            setAllCompanies(
              companyResult.data
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
    router,
    userId,
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

  function resetEditForm() {
    if (!user) {
      return;
    }

    setForm({
      firstName:
        user.firstName,
      lastName:
        user.lastName,
      phoneNumber:
        user.phoneNumber,
      email:
        user.email ?? "",
      isActive:
        user.isActive,
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

    const firstName =
      form.firstName.trim();

    const lastName =
      form.lastName.trim();

    const phoneNumber =
      form.phoneNumber.trim();

    if (
      !firstName ||
      !lastName ||
      !phoneNumber
    ) {
      setIsError(true);

      setMessage(
        "Ad, soyad ve telefon numarası zorunludur."
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
        `${API_URL}/users/${userId}`,
        {
          method: "PUT",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            phoneNumber,
            email:
              form.email.trim() ||
              null,
            isActive:
              form.isActive,
          }),
        }
      );

      const result =
        await parseResponse<
          Partial<UserDetail>
        >(response);

      setUser((current) =>
        current
          ? {
              ...current,
              ...result.data,
              firstName,
              lastName,
              phoneNumber,
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
          "Kullanıcı başarıyla güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Kullanıcı güncellenemedi."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStatusChange() {
    if (!user) {
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
      !user.isActive;

    try {
      setIsProcessing(true);
      setMessage("");
      setIsError(false);

      const response = await fetch(
        `${API_URL}/users/${userId}/status`,
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

      setUser((current) =>
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
          "Kullanıcı durumu güncellendi."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Durum değiştirilemedi."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAssignRole() {
    if (!selectedRoleId) {
      setIsError(true);
      setMessage("Bir rol seçin.");
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
        `${API_URL}/users/${userId}/roles`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            roleId:
              selectedRoleId,
          }),
        }
      );

      const result =
        await parseResponse<Role>(
          response
        );

      if (result.data) {
        setUser((current) =>
          current
            ? {
                ...current,
                roles: [
                  ...current.roles,
                  result.data as Role,
                ],
              }
            : current
        );
      }

      setSelectedRoleId("");

      setMessage(
        result.message ??
          "Rol kullanıcıya atandı."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Rol atanamadı."
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
        `${role.name} rolünü kullanıcıdan kaldırmak istediğinizden emin misiniz?`
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
        `${API_URL}/users/${userId}/roles/${role.id}`,
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

      setUser((current) =>
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
          "Rol kullanıcıdan kaldırıldı."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Rol kaldırılamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAssignCompany() {
    if (!selectedCompanyId) {
      setIsError(true);
      setMessage("Bir firma seçin.");
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
        `${API_URL}/users/${userId}/companies`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            companyId:
              selectedCompanyId,
          }),
        }
      );

      const result =
        await parseResponse<Company>(
          response
        );

      if (result.data) {
        setUser((current) =>
          current
            ? {
                ...current,
                companies: [
                  ...current.companies,
                  result.data as Company,
                ],
              }
            : current
        );
      }

      setSelectedCompanyId("");

      setMessage(
        result.message ??
          "Firma kullanıcıya atandı."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Firma atanamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRemoveCompany(
    company: Company
  ) {
    const confirmed =
      window.confirm(
        `${company.name} firmasını kullanıcıdan kaldırmak istediğinizden emin misiniz?`
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
        `${API_URL}/users/${userId}/companies/${company.id}`,
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

      setUser((current) =>
        current
          ? {
              ...current,
              companies:
                current.companies.filter(
                  (item) =>
                    item.id !== company.id
                ),
            }
          : current
      );

      setMessage(
        result.message ??
          "Firma kullanıcıdan kaldırıldı."
      );
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Firma kaldırılamadı."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        "Bu kullanıcıyı silmek istediğinizden emin misiniz?"
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
        `${API_URL}/users/${userId}`,
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

      router.replace("/users");
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Kullanıcı silinemedi."
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
          Kullanıcı bilgileri yükleniyor...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="dashboard-error">
        <h1>
          Kullanıcı bulunamadı
        </h1>

        <p>{message}</p>

        <Link
          className="primary-link-button"
          href="/users"
        >
          Kullanıcı listesine dön
        </Link>
      </main>
    );
  }

  const isCurrentUser =
    currentUserId === user.id;

  return (
    <main className="dashboard-layout">
      <AppSidebar />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Kullanıcı Detayı
            </span>

            <h1>
              {user.firstName}{" "}
              {user.lastName}
            </h1>

            <p>
              Kullanıcı bilgilerini,
              rollerini ve firma
              bağlantılarını yönetin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/users"
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
            <section className="user-profile-card">
              <div className="user-profile-main">
                <div className="user-profile-avatar">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </div>

                <div>
                  <h2>
                    {user.firstName}{" "}
                    {user.lastName}
                  </h2>

                  <p>{user.phoneNumber}</p>

                  <div className="user-profile-badges">
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

                    <span
                      className={
                        user.phoneNumberConfirmed
                          ? "phone-confirmed-badge"
                          : "phone-unconfirmed-badge"
                      }
                    >
                      {user.phoneNumberConfirmed
                        ? "Telefon doğrulandı"
                        : "Telefon doğrulanmadı"}
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
                    isProcessing ||
                    isCurrentUser
                  }
                >
                  {user.isActive
                    ? "Pasif yap"
                    : "Aktif yap"}
                </button>

                <button
                  className="danger-action-button"
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    isDeleting ||
                    isCurrentUser
                  }
                >
                  {isDeleting
                    ? "Siliniyor..."
                    : "Kullanıcıyı sil"}
                </button>
              </div>
            </section>

            <section className="detail-grid">
              <article className="detail-panel">
                <h2>
                  Kullanıcı bilgileri
                </h2>

                <div className="detail-list">
                  <div>
                    <span>Ad soyad</span>
                    <strong>
                      {user.firstName}{" "}
                      {user.lastName}
                    </strong>
                  </div>

                  <div>
                    <span>Telefon</span>
                    <strong>
                      {user.phoneNumber}
                    </strong>
                  </div>

                  <div>
                    <span>E-posta</span>
                    <strong>
                      {user.email ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Son giriş</span>
                    <strong>
                      {formatDate(
                        user.lastLoginAt
                      )}
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
                        user.createdAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Son güncelleme
                    </span>
                    <strong>
                      {formatDate(
                        user.updatedAt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Rol sayısı</span>
                    <strong>
                      {user.roles.length}
                    </strong>
                  </div>

                  <div>
                    <span>Firma sayısı</span>
                    <strong>
                      {user.companies.length}
                    </strong>
                  </div>
                </div>
              </article>
            </section>

            <section className="user-assignment-grid">
              <article className="user-assignment-panel">
                <div className="user-assignment-header">
                  <div>
                    <h2>Roller</h2>
                    <p>
                      Kullanıcının sistem
                      yetkileri
                    </p>
                  </div>
                </div>

                <div className="assignment-add-row">
                  <select
                    value={selectedRoleId}
                    onChange={(event) =>
                      setSelectedRoleId(
                        event.target.value
                      )
                    }
                    disabled={
                      isProcessing ||
                      !user.isActive
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
                      !user.isActive
                    }
                  >
                    Rol ekle
                  </button>
                </div>

                <div className="assignment-card-list">
                  {user.roles.length === 0 ? (
                    <p className="assignment-empty">
                      Kullanıcıya atanmış rol
                      yok.
                    </p>
                  ) : (
                    user.roles.map(
                      (role) => (
                        <div
                          className="assignment-card"
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
                      )
                    )
                  )}
                </div>
              </article>

              <article className="user-assignment-panel">
                <div className="user-assignment-header">
                  <div>
                    <h2>Firmalar</h2>
                    <p>
                      Kullanıcının erişebildiği
                      firmalar
                    </p>
                  </div>
                </div>

                <div className="assignment-add-row">
                  <select
                    value={
                      selectedCompanyId
                    }
                    onChange={(event) =>
                      setSelectedCompanyId(
                        event.target.value
                      )
                    }
                    disabled={
                      isProcessing ||
                      !user.isActive
                    }
                  >
                    <option value="">
                      Firma seçin
                    </option>

                    {availableCompanies.map(
                      (company) => (
                        <option
                          key={company.id}
                          value={company.id}
                        >
                          {company.name}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={
                      handleAssignCompany
                    }
                    disabled={
                      isProcessing ||
                      !selectedCompanyId ||
                      !user.isActive
                    }
                  >
                    Firma ekle
                  </button>
                </div>

                <div className="assignment-card-list">
                  {user.companies.length ===
                  0 ? (
                    <p className="assignment-empty">
                      Kullanıcıya atanmış
                      firma yok.
                    </p>
                  ) : (
                    user.companies.map(
                      (company) => (
                        <div
                          className="assignment-card"
                          key={company.id}
                        >
                          <div>
                            <strong>
                              {company.name}
                            </strong>
                            <span>
                              Firma bağlantısı
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveCompany(
                                company
                              )
                            }
                            disabled={
                              isProcessing
                            }
                          >
                            Kaldır
                          </button>
                        </div>
                      )
                    )
                  )}
                </div>
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
                    Kullanıcı bilgilerini
                    düzenle
                  </h2>

                  <p>
                    Kimlik, iletişim ve hesap
                    durumunu güncelleyin.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label>Ad *</label>

                  <input
                    value={
                      form.firstName
                    }
                    onChange={(event) =>
                      updateField(
                        "firstName",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Soyad *</label>

                  <input
                    value={
                      form.lastName
                    }
                    onChange={(event) =>
                      updateField(
                        "lastName",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Telefon *</label>

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
                    required
                  />

                  <span>
                    Telefon değişirse
                    doğrulama durumu sıfırlanır.
                  </span>
                </div>

                <div className="form-field">
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
                  />
                </div>

                <div className="form-field full">
                  <label>
                    Hesap durumu
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
                    disabled={isCurrentUser}
                  >
                    <option value="true">
                      Aktif
                    </option>

                    <option value="false">
                      Pasif
                    </option>
                  </select>
                </div>
              </div>
            </section>

            <div className="form-actions">
              <button
                className="cancel-form-button"
                type="button"
                onClick={resetEditForm}
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