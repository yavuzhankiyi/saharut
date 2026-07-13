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

interface Company {
  id: string;
  name: string;
  isActive: boolean;
}

interface Customer {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface AssignableUser {
  id: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  companyIds?: string[];
  companies?: Array<{
    id: string;
    name: string;
  }>;
}

interface Visit {
  id: string;
  companyId: string;
  customerId: string;
  assignedUserId: string;
  title: string;
  purpose?: string | null;
  plannedStartAt: string;
  plannedEndAt: string;
  status: number;
  statusName: string;
  notes?: string | null;
}

interface CurrentUser {
  id: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string | null;
  errors?: Record<string, string[]>;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
  message?: string | null;
}

const initialForm = {
  companyId: "",
  customerId: "",
  assignedUserId: "",
  title: "",
  purpose: "",
  plannedStartAt: "",
  plannedEndAt: "",
  notes: "",
};

function toLocalDateTimeValue(
  value: string
) {
  const date = new Date(value);

  const offset =
    date.getTimezoneOffset() * 60_000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
}

export default function EditVisitPage() {
  const router = useRouter();

  const params =
    useParams<{ id: string }>();

  const visitId = params.id;

  const [form, setForm] =
    useState(initialForm);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [users, setUsers] =
    useState<AssignableUser[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const filteredCustomers =
    useMemo(() => {
      return customers.filter(
        (customer) =>
          customer.companyId ===
          form.companyId
      );
    }, [
      customers,
      form.companyId,
    ]);

  const filteredUsers =
    useMemo(() => {
      return users.filter((user) => {
        if (user.isActive === false) {
          return false;
        }

        if (
          user.companyIds &&
          user.companyIds.length > 0
        ) {
          return user.companyIds.includes(
            form.companyId
          );
        }

        if (
          user.companies &&
          user.companies.length > 0
        ) {
          return user.companies.some(
            (company) =>
              company.id ===
              form.companyId
          );
        }

        return true;
      });
    }, [
      form.companyId,
      users,
    ]);

  useEffect(() => {
    const token =
      localStorage.getItem(
        "saharut_access_token"
      );

    const storedUser =
      localStorage.getItem(
        "saharut_user"
      );

    if (!token) {
      router.replace("/");
      return;
    }

    let parsedUser:
      | CurrentUser
      | null = null;

    if (storedUser) {
      try {
        parsedUser =
          JSON.parse(storedUser);

        setCurrentUser(parsedUser);
      } catch {
        localStorage.removeItem(
          "saharut_user"
        );
      }
    }

    async function loadData() {
      try {
        const [
          visitResponse,
          companyResponse,
          customerResponse,
          userResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/visits/${visitId}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),

          fetch(
            `${API_URL}/companies?page=1&pageSize=100&isActive=true`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),

          fetch(
            `${API_URL}/customers?page=1&pageSize=100&isActive=true&sortBy=name&sortDirection=asc`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),

          fetch(
            `${API_URL}/users?page=1&pageSize=100&isActive=true`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          ),
        ]);

        if (
          visitResponse.status === 401 ||
          companyResponse.status === 401 ||
          customerResponse.status === 401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const visitResult =
          (await visitResponse.json()) as
            ApiResponse<Visit>;

        const companyResult =
          (await companyResponse.json()) as
            ListResponse<Company>;

        const customerResult =
          (await customerResponse.json()) as
            ListResponse<Customer>;

        let userResult:
          | ListResponse<AssignableUser>
          | null = null;

        if (userResponse.ok) {
          userResult =
            (await userResponse.json()) as
              ListResponse<AssignableUser>;
        }

        if (
          !visitResponse.ok ||
          !visitResult.success ||
          !visitResult.data
        ) {
          throw new Error(
            visitResult.message ??
              "Ziyaret alınamadı."
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

        if (
          !customerResponse.ok ||
          !customerResult.success
        ) {
          throw new Error(
            customerResult.message ??
              "Müşteriler alınamadı."
          );
        }

        const visit =
          visitResult.data;

        if (
          !visit.statusName
            .toLowerCase()
            .includes("planned")
        ) {
          throw new Error(
            "Yalnızca planlanmış ziyaretler düzenlenebilir."
          );
        }

        setCompanies(
          companyResult.data
        );

        setCustomers(
          customerResult.data
        );

        if (
          userResult?.success &&
          userResult.data.length > 0
        ) {
          setUsers(userResult.data);
        } else if (parsedUser) {
          setUsers([
            {
              id: parsedUser.id,
              firstName:
                parsedUser.firstName,
              lastName:
                parsedUser.lastName,
              isActive: true,
            },
          ]);
        }

        setForm({
          companyId:
            visit.companyId,
          customerId:
            visit.customerId,
          assignedUserId:
            visit.assignedUserId,
          title:
            visit.title,
          purpose:
            visit.purpose ?? "",
          plannedStartAt:
            toLocalDateTimeValue(
              visit.plannedStartAt
            ),
          plannedEndAt:
            toLocalDateTimeValue(
              visit.plannedEndAt
            ),
          notes:
            visit.notes ?? "",
        });
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Bilgiler yüklenemedi."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [
    router,
    visitId,
  ]);

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
      !form.customerId ||
      !form.assignedUserId ||
      !form.title.trim() ||
      !form.plannedStartAt ||
      !form.plannedEndAt
    ) {
      setIsError(true);

      setMessage(
        "Zorunlu alanları doldurun."
      );

      return;
    }

    const startDate =
      new Date(
        form.plannedStartAt
      );

    const endDate =
      new Date(
        form.plannedEndAt
      );

    if (endDate <= startDate) {
      setIsError(true);

      setMessage(
        "Bitiş zamanı başlangıç zamanından sonra olmalıdır."
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
        `${API_URL}/visits/${visitId}`,
        {
          method: "PUT",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            companyId:
              form.companyId,
            customerId:
              form.customerId,
            assignedUserId:
              form.assignedUserId,
            title:
              form.title.trim(),
            purpose:
              form.purpose.trim() ||
              null,
            plannedStartAt:
              startDate.toISOString(),
            plannedEndAt:
              endDate.toISOString(),
            notes:
              form.notes.trim() ||
              null,
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
            "Ziyaret güncellenemedi."
        );
      }

      setMessage(
        result.message ??
          "Ziyaret başarıyla güncellendi."
      );

      setTimeout(() => {
        router.push(
          `/visits/${visitId}`
        );
      }, 700);
    } catch (error) {
      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "Ziyaret güncellenemedi."
      );
    } finally {
      setIsSaving(false);
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
          Ziyaret bilgileri yükleniyor...
        </p>
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
              Ziyaret Yönetimi
            </span>

            <h1>
              Ziyareti düzenle
            </h1>

            <p>
              Planlama ve görevlendirme
              bilgilerini güncelleyin.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href={`/visits/${visitId}`}
            >
              Detaya dön
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
                  Ziyaret bilgileri
                </h2>

                <p>
                  Firma, müşteri ve görevli
                  kullanıcı
                </p>
              </div>

              <span>
                Zorunlu alanlar *
              </span>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>
                  Firma *
                </label>

                <select
                  value={form.companyId}
                  onChange={(event) => {
                    updateField(
                      "companyId",
                      event.target.value
                    );

                    updateField(
                      "customerId",
                      ""
                    );
                  }}
                  required
                >
                  <option value="">
                    Firma seçin
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
              </div>

              <div className="form-field">
                <label>
                  Müşteri *
                </label>

                <select
                  value={form.customerId}
                  onChange={(event) =>
                    updateField(
                      "customerId",
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Müşteri seçin
                  </option>

                  {filteredCustomers.map(
                    (customer) => (
                      <option
                        key={customer.id}
                        value={customer.id}
                      >
                        {customer.name} ·{" "}
                        {customer.code}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-field full">
                <label>
                  Atanacak kullanıcı *
                </label>

                <select
                  value={
                    form.assignedUserId
                  }
                  onChange={(event) =>
                    updateField(
                      "assignedUserId",
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Kullanıcı seçin
                  </option>

                  {filteredUsers.map(
                    (assignableUser) => (
                      <option
                        key={
                          assignableUser.id
                        }
                        value={
                          assignableUser.id
                        }
                      >
                        {
                          assignableUser.firstName
                        }{" "}
                        {
                          assignableUser.lastName
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-field full">
                <label>
                  Ziyaret başlığı *
                </label>

                <input
                  value={form.title}
                  onChange={(event) =>
                    updateField(
                      "title",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  required
                />
              </div>

              <div className="form-field full">
                <label>
                  Ziyaret amacı
                </label>

                <textarea
                  rows={4}
                  maxLength={1000}
                  value={form.purpose}
                  onChange={(event) =>
                    updateField(
                      "purpose",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>
                  Tarih ve saat
                </h2>

                <p>
                  Planlanan ziyaret aralığı
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label>
                  Başlangıç zamanı *
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.plannedStartAt
                  }
                  onChange={(event) =>
                    updateField(
                      "plannedStartAt",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-field">
                <label>
                  Bitiş zamanı *
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.plannedEndAt
                  }
                  onChange={(event) =>
                    updateField(
                      "plannedEndAt",
                      event.target.value
                    )
                  }
                  required
                />
              </div>
            </div>
          </section>

          <section className="form-panel">
            <div className="form-panel-header">
              <div>
                <h2>Notlar</h2>

                <p>
                  Saha personeli için ek
                  açıklamalar
                </p>
              </div>
            </div>

            <div className="form-field full">
              <textarea
                rows={5}
                maxLength={2000}
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value
                  )
                }
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
              href={`/visits/${visitId}`}
            >
              Vazgeç
            </Link>

            <button
              className="save-form-button"
              type="submit"
              disabled={
                isSaving ||
                isError
              }
            >
              {isSaving
                ? "Kaydediliyor..."
                : "Değişiklikleri kaydet"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}