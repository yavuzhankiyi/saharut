"use client";

import AppSidebar from "@/app/components/AppSidebar";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

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
  phoneNumber?: string | null;
  email?: string | null;
  isActive?: boolean;
  companyIds?: string[];
  companies?: Array<{
    id: string;
    name: string;
  }>;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string | null;
  roles: string[];
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
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

function toLocalDateTimeValue(date: Date) {
  const offset =
    date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

export default function NewVisitPage() {
  const router = useRouter();

  const [form, setForm] =
    useState(initialForm);

  const [companies, setCompanies] =
    useState<Company[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [users, setUsers] =
    useState<AssignableUser[]>([]);

  const [currentUser, setCurrentUser] =
    useState<UserData | null>(null);

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
      if (!form.companyId) {
        return [];
      }

      return customers.filter(
        (customer) =>
          customer.companyId ===
          form.companyId
      );
    }, [
      customers,
      form.companyId,
    ]);

  const assignableUsers =
    useMemo(() => {
      if (!form.companyId) {
        return [];
      }

      return users.filter((user) => {
        if (
          user.isActive === false
        ) {
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

    let parsedUser: UserData | null =
      null;

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

    async function loadFormData() {
      try {
        const [
          companyResponse,
          customerResponse,
          userResponse,
        ] = await Promise.all([
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
          companyResponse.status === 401 ||
          customerResponse.status === 401 ||
          userResponse.status === 401
        ) {
          localStorage.clear();
          router.replace("/");
          return;
        }

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
          !companyResponse.ok ||
          !companyResult.success
        ) {
          throw new Error(
            companyResult.message ??
              "Firmalar yüklenemedi."
          );
        }

        if (
          !customerResponse.ok ||
          !customerResult.success
        ) {
          throw new Error(
            customerResult.message ??
              "Müşteriler yüklenemedi."
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
              phoneNumber:
                parsedUser.phoneNumber,
              email:
                parsedUser.email,
              isActive: true,
            },
          ]);
        }

        const defaultStart =
          new Date();

        defaultStart.setMinutes(
          defaultStart.getMinutes() + 30
        );

        defaultStart.setSeconds(
          0,
          0
        );

        const defaultEnd =
          new Date(
            defaultStart.getTime() +
              60 * 60 * 1000
          );

        setForm((current) => ({
          ...current,
          plannedStartAt:
            toLocalDateTimeValue(
              defaultStart
            ),
          plannedEndAt:
            toLocalDateTimeValue(
              defaultEnd
            ),
        }));

        if (
          companyResult.data.length === 1
        ) {
          setForm((current) => ({
            ...current,
            companyId:
              companyResult.data[0].id,
          }));
        }
      } catch (error) {
        setIsError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "Form bilgileri yüklenemedi."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadFormData();
  }, [router]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      customerId: "",
      assignedUserId: "",
    }));
  }, [form.companyId]);

  useEffect(() => {
    if (
      filteredCustomers.length === 1
    ) {
      setForm((current) => ({
        ...current,
        customerId:
          filteredCustomers[0].id,
      }));
    }
  }, [filteredCustomers]);

  useEffect(() => {
    if (
      assignableUsers.length === 1
    ) {
      setForm((current) => ({
        ...current,
        assignedUserId:
          assignableUsers[0].id,
      }));
    }
  }, [assignableUsers]);

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
        "Firma, müşteri, atanacak kullanıcı, başlık, başlangıç ve bitiş zamanı zorunludur."
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

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      setIsError(true);
      setMessage(
        "Başlangıç ve bitiş zamanlarını kontrol edin."
      );
      return;
    }

    if (
      endDate <= startDate
    ) {
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
        `${API_URL}/visits`,
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
          ApiResponse;

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
            "Ziyaret planlanamadı."
        );
      }

      setMessage(
        result.message ??
          "Ziyaret başarıyla planlandı."
      );

      setTimeout(() => {
        router.push("/visits");
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
              Ziyaret Yönetimi
            </span>

            <h1>Yeni ziyaret</h1>

            <p>
              Saha ekibi için yeni ziyaret
              planı oluşturun.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/visits"
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
                    isLoading ||
                    isSaving
                  }
                  required
                >
                  <option value="">
                    {isLoading
                      ? "Firmalar yükleniyor..."
                      : "Firma seçin"}
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
                <label htmlFor="customerId">
                  Müşteri *
                </label>

                <select
                  id="customerId"
                  value={form.customerId}
                  onChange={(event) =>
                    updateField(
                      "customerId",
                      event.target.value
                    )
                  }
                  disabled={
                    !form.companyId ||
                    isLoading ||
                    isSaving
                  }
                  required
                >
                  <option value="">
                    {!form.companyId
                      ? "Önce firma seçin"
                      : "Müşteri seçin"}
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
                <label htmlFor="assignedUserId">
                  Atanacak kullanıcı *
                </label>

                <select
                  id="assignedUserId"
                  value={
                    form.assignedUserId
                  }
                  onChange={(event) =>
                    updateField(
                      "assignedUserId",
                      event.target.value
                    )
                  }
                  disabled={
                    !form.companyId ||
                    isLoading ||
                    isSaving
                  }
                  required
                >
                  <option value="">
                    {!form.companyId
                      ? "Önce firma seçin"
                      : "Kullanıcı seçin"}
                  </option>

                  {assignableUsers.map(
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
                <label htmlFor="title">
                  Ziyaret başlığı *
                </label>

                <input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    updateField(
                      "title",
                      event.target.value
                    )
                  }
                  maxLength={200}
                  placeholder="Örn. Aylık satış görüşmesi"
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field full">
                <label htmlFor="purpose">
                  Ziyaret amacı
                </label>

                <textarea
                  id="purpose"
                  value={form.purpose}
                  onChange={(event) =>
                    updateField(
                      "purpose",
                      event.target.value
                    )
                  }
                  maxLength={1000}
                  rows={4}
                  placeholder="Ziyaretin amacı ve görüşülecek konular..."
                  disabled={isSaving}
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
                <label htmlFor="plannedStartAt">
                  Başlangıç zamanı *
                </label>

                <input
                  id="plannedStartAt"
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
                  disabled={isSaving}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="plannedEndAt">
                  Bitiş zamanı *
                </label>

                <input
                  id="plannedEndAt"
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
                  disabled={isSaving}
                  required
                />
              </div>
            </div>

            <div className="visit-plan-help">
              <span>◇</span>

              <p>
                Bitiş zamanı başlangıç
                zamanından sonra olmalıdır.
                Ziyaret oluşturulduğunda
                başlangıç durumu Planlandı
                olarak kaydedilir.
              </p>
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
                id="notes"
                value={form.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value
                  )
                }
                maxLength={2000}
                rows={5}
                placeholder="Ziyaret öncesi hazırlanması gerekenler, müşteri talepleri..."
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
              href="/visits"
            >
              İptal
            </Link>

            <button
              className="save-form-button"
              type="submit"
              disabled={
                isLoading ||
                isSaving
              }
            >
              {isSaving
                ? "Planlanıyor..."
                : "Ziyareti planla"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
