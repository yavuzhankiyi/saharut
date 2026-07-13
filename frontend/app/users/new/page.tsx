"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

const API_URL =
  "http://localhost:5062/api/v1";

interface Company {
  id: string;
  name: string;
  isActive?: boolean;
}

interface Role {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface PagedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
  message?: string | null;
}

interface ApiResponse {
  success: boolean;
  message?: string | null;
  data?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string | null;
    isActive: boolean;
    companyId?: string | null;
    companyName?: string | null;
    roleId?: string | null;
    roleName?: string | null;
  };
  errors?: Record<string, string[]>;
}

const initialForm = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  companyId: "",
  roleId: "",
};

export default function NewUserPage() {
  const router = useRouter();

  const [form, setForm] =
    useState(initialForm);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] =
    useState(true);

  const [isSaving, setIsSaving] =
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

    async function loadOptions() {
      try {
        const [
          companyResponse,
          roleResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/companies?page=1&pageSize=100&isActive=true&sortBy=name&sortDirection=asc`,
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
        ]);

        if (
          companyResponse.status === 401 ||
          roleResponse.status === 401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const companyResult =
          (await companyResponse.json()) as
            PagedResponse<Company>;

        const roleResult =
          (await roleResponse.json()) as
            PagedResponse<Role>;

        if (
          !companyResponse.ok ||
          !companyResult.success
        ) {
          throw new Error(
            companyResult.message ??
              "Firmalar yüklenemedi."
          );
        }

        if (
          !roleResponse.ok ||
          !roleResult.success
        ) {
          throw new Error(
            roleResult.message ??
              "Roller yüklenemedi."
          );
        }

        setCompanies(companyResult.data);
        setRoles(roleResult.data);
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Form seçenekleri yüklenemedi."
        );
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
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
      setIsSaving(true);

      const response = await fetch(
        `${API_URL}/users`,
        {
          method: "POST",
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
              form.email.trim() || null,
            companyId:
              form.companyId || null,
            roleId:
              form.roleId || null,
          }),
        }
      );

      const result =
        (await response.json()) as
          ApiResponse;

      if (
        response.status === 401
      ) {
        localStorage.clear();
        router.replace("/");
        return;
      }

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
            "Kullanıcı oluşturulamadı."
        );
      }

      setMessage(
        result.message ??
          "Kullanıcı başarıyla oluşturuldu."
      );

      setTimeout(() => {
        if (result.data?.id) {
          router.push(
            `/users/${result.data.id}`
          );

          return;
        }

        router.push("/users");
      }, 700);
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
              Kullanıcı Yönetimi
            </span>

            <h1>Yeni kullanıcı</h1>

            <p>
              Kullanıcı bilgilerini,
              başlangıç firmasını ve rolünü
              tanımlayın.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/users"
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
                <h2>
                  Kişisel bilgiler
                </h2>

                <p>
                  Kullanıcının temel kimlik ve
                  iletişim bilgileri
                </p>
              </div>

              <span>
                Zorunlu alanlar *
              </span>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="firstName">
                  Ad *
                </label>

                <input
                  id="firstName"
                  value={form.firstName}
                  onChange={(event) =>
                    updateField(
                      "firstName",
                      event.target.value
                    )
                  }
                  placeholder="Örn. Ahmet"
                  autoComplete="given-name"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="lastName">
                  Soyad *
                </label>

                <input
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) =>
                    updateField(
                      "lastName",
                      event.target.value
                    )
                  }
                  placeholder="Örn. Yılmaz"
                  autoComplete="family-name"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="phoneNumber">
                  Telefon numarası *
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
                  placeholder="+90 555 000 00 00"
                  autoComplete="tel"
                  disabled={isSaving}
                  required
                />

                <span>
                  Telefon numarası sistemde
                  benzersiz olmalıdır.
                </span>
              </div>

              <div className="form-field">
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
                  placeholder="kullanici@firma.com"
                  autoComplete="email"
                  disabled={isSaving}
                />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>
                  Yetkilendirme
                </h2>

                <p>
                  Kullanıcının başlangıç firma
                  ve rol bağlantıları
                </p>
              </div>

              <span>
                İsteğe bağlı
              </span>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="companyId">
                  Firma
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
                    isLoadingOptions ||
                    isSaving
                  }
                >
                  <option value="">
                    Firma atama
                  </option>

                  {companies.map(
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

                <span>
                  Kullanıcı daha sonra birden
                  fazla firmaya bağlanabilir.
                </span>
              </div>

              <div className="form-field">
                <label htmlFor="roleId">
                  Rol
                </label>

                <select
                  id="roleId"
                  value={form.roleId}
                  onChange={(event) =>
                    updateField(
                      "roleId",
                      event.target.value
                    )
                  }
                  disabled={
                    isLoadingOptions ||
                    isSaving
                  }
                >
                  <option value="">
                    Rol atama
                  </option>

                  {roles.map((role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {role.name}
                    </option>
                  ))}
                </select>

                <span>
                  Rol, kullanıcının sistem
                  yetkilerini belirler.
                </span>
              </div>
            </div>

            <div className="user-create-help">
              <span>i</span>

              <div>
                <strong>
                  Kullanıcı başlangıçta aktif
                  oluşturulur.
                </strong>

                <p>
                  Telefon doğrulama durumu
                  başlangıçta doğrulanmamış
                  olarak kaydedilir. Kullanıcı
                  OTP ile ilk girişini
                  yaptığında doğrulama süreci
                  tamamlanır.
                </p>
              </div>
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
              href="/users"
            >
              İptal
            </Link>

            <button
              className="save-form-button"
              type="submit"
              disabled={
                isSaving ||
                isLoadingOptions
              }
            >
              {isSaving
                ? "Oluşturuluyor..."
                : "Kullanıcıyı oluştur"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
