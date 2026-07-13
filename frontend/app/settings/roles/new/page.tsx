"use client";

import AppSidebar from "@/app/components/AppSidebar";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  "http://localhost:5062/api/v1";

interface ApiResponse {
  success: boolean;
  message?: string | null;
  data?: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    isActive: boolean;
  };
  errors?: Record<string, string[]>;
}

const initialForm = {
  name: "",
  code: "",
  description: "",
};

export default function NewRolePage() {
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

    if (field === "code") {
      return;
    }

    if (isError) {
      setMessage("");
      setIsError(false);
    }
  }

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

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
      setIsSaving(true);

      const response = await fetch(
        `${API_URL}/roles`,
        {
          method: "POST",
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
          }),
        }
      );

      if (
        response.status === 401
      ) {
        localStorage.clear();
        router.replace("/");
        return;
      }

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
            "Rol oluşturulamadı."
        );
      }

      setMessage(
        result.message ??
          "Rol başarıyla oluşturuldu."
      );

      setTimeout(() => {
        if (result.data?.id) {
          router.push(
            `/settings/roles/${result.data.id}`
          );

          return;
        }

        router.push("/settings");
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
              Rol Yönetimi
            </span>

            <h1>Yeni rol</h1>

            <p>
              Kullanıcılara atanabilecek
              yeni bir sistem rolü oluşturun.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/settings"
            >
              Rol listesine dön
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
                <h2>Rol bilgileri</h2>

                <p>
                  Rol adı, sistem kodu ve
                  açıklamasını tanımlayın.
                </p>
              </div>

              <span>
                Zorunlu alanlar *
              </span>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="name">
                  Rol adı *
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
                  placeholder="Örn. Bölge Satış Müdürü"
                  disabled={isSaving}
                  required
                />

                <span>
                  Kullanıcı arayüzünde
                  gösterilecek rol adı
                </span>
              </div>

              <div className="form-field">
                <label htmlFor="code">
                  Rol kodu *
                </label>

                <input
                  id="code"
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: normalizeCode(
                        event.target.value
                      ),
                    }))
                  }
                  placeholder="REGIONAL_SALES_MANAGER"
                  disabled={isSaving}
                  required
                />

                <span>
                  Büyük harf, sayı ve alt
                  çizgi kullanılır.
                </span>
              </div>

              <div className="form-field full">
                <label htmlFor="description">
                  Açıklama
                </label>

                <textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Bu rolün sistemdeki sorumluluklarını açıklayın..."
                  rows={6}
                  disabled={isSaving}
                />

                <span>
                  Rolün kullanım amacını
                  kısa ve anlaşılır şekilde
                  belirtin.
                </span>
              </div>
            </div>

            <div className="role-create-preview">
              <div className="role-create-preview-icon">
                ◈
              </div>

              <div>
                <span>Rol önizlemesi</span>

                <strong>
                  {form.name.trim() ||
                    "Yeni sistem rolü"}
                </strong>

                <small>
                  {normalizeCode(form.code) ||
                    "ROLE_CODE"}
                </small>
              </div>
            </div>

            <div className="company-form-help">
              <span>i</span>

              <p>
                Rol kodu sistem genelinde
                benzersiz olmalıdır. Rol
                oluşturulduktan sonra yetkiler
                rol detay ekranından
                atanacaktır.
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
              href="/settings"
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
                : "Rolü oluştur"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
