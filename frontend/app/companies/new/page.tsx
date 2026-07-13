"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface ApiResponse {
  success: boolean;
  message?: string | null;
  data?: {
    id: string;
  };
  errors?: Record<string, string[]>;
}

const initialForm = {
  name: "",
  taxNumber: "",
  phoneNumber: "",
  email: "",
};

export default function NewCompanyPage() {
  const router = useRouter();

  const [form, setForm] =
    useState(initialForm);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

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
        `${API_URL}/companies`,
        {
          method: "POST",
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
            "Firma oluşturulamadı."
        );
      }

      setMessage(
        result.message ??
          "Firma başarıyla oluşturuldu."
      );

      setTimeout(() => {
        if (result.data?.id) {
          router.push(
            `/companies/${result.data.id}`
          );
          return;
        }

        router.push("/companies");
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
              Firma Yönetimi
            </span>

            <h1>Yeni firma</h1>

            <p>
              Sistemde kullanılacak yeni
              firma kaydını oluşturun.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/companies"
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
                <h2>Firma bilgileri</h2>

                <p>
                  Temel kimlik ve iletişim
                  bilgilerini girin.
                </p>
              </div>

              <span>
                Zorunlu alanlar *
              </span>
            </div>

            <div className="form-grid">
              <div className="form-field full">
                <label htmlFor="name">
                  Firma adı *
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
                  minLength={2}
                  maxLength={200}
                  placeholder="Örn. Saharut Gıda A.Ş."
                  disabled={isSaving}
                  required
                />

                <span>
                  Firma adı en az 2, en fazla
                  200 karakter olabilir.
                </span>
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
                  maxLength={20}
                  placeholder="1234567890"
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
                  placeholder="+90 212 000 00 00"
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
                  placeholder="info@firma.com"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="company-form-help">
              <span>i</span>

              <p>
                Vergi numarası sistem genelinde
                benzersiz olmalıdır. Aynı vergi
                numarasıyla ikinci bir firma
                oluşturulamaz.
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
              href="/companies"
            >
              İptal
            </Link>

            <button
              className="save-form-button"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Oluşturuluyor..."
                : "Firmayı oluştur"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
