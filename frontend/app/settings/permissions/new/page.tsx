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
    module: string;
    description?: string | null;
    isActive: boolean;
  };
  errors?: Record<string, string[]>;
}

const initialForm = {
  name: "",
  code: "",
  module: "",
  description: "",
};

export default function NewPermissionPage() {
  const router = useRouter();

  const [form, setForm] =
    useState(initialForm);

  const [isSaving, setIsSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

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

  function normalizeModule(
    value: string
  ) {
    return normalizeCode(value);
  }

  function updateField(
    field: keyof typeof initialForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (isError) {
      setMessage("");
      setIsError(false);
    }
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

    const module =
      normalizeModule(form.module);

    if (!name || !code || !module) {
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
      setIsSaving(true);

      const response = await fetch(
        `${API_URL}/permissions`,
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
            module,
            description:
              form.description.trim() ||
              null,
          }),
        }
      );

      if (response.status === 401) {
        localStorage.clear();
        router.replace("/");
        return;
      }

      if (response.status === 403) {
        throw new Error(
          "Yeni yetki oluşturmak için SUPER_ADMIN rolü gerekiyor."
        );
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
            "Yetki oluşturulamadı."
        );
      }

      setMessage(
        result.message ??
          "Yetki başarıyla oluşturuldu."
      );

      setTimeout(() => {
        if (result.data?.id) {
          router.push(
            `/settings/permissions/${result.data.id}`
          );

          return;
        }

        router.push(
          "/settings/permissions"
        );
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
              Yetki Yönetimi
            </span>

            <h1>Yeni yetki</h1>

            <p>
              Sistem modüllerinde kullanılacak
              yeni bir erişim yetkisi oluşturun.
            </p>
          </div>

          <div className="header-actions">
            <Link
              className="secondary-link-button"
              href="/settings/permissions"
            >
              Yetki listesine dön
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
                  Yetki bilgileri
                </h2>

                <p>
                  Ad, sistem kodu, modül ve
                  açıklama bilgilerini girin.
                </p>
              </div>

              <span>
                Zorunlu alanlar *
              </span>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="name">
                  Yetki adı *
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
                  placeholder="Örn. Müşteri Görüntüleme"
                  disabled={isSaving}
                  required
                />

                <span>
                  Kullanıcı arayüzünde
                  gösterilecek açıklayıcı ad
                </span>
              </div>

              <div className="form-field">
                <label htmlFor="module">
                  Modül *
                </label>

                <input
                  id="module"
                  value={form.module}
                  onChange={(event) =>
                    updateField(
                      "module",
                      normalizeModule(
                        event.target.value
                      )
                    )
                  }
                  placeholder="CUSTOMERS"
                  disabled={isSaving}
                  required
                />

                <span>
                  Örn. USERS, CUSTOMERS,
                  PRODUCTS veya VISITS
                </span>
              </div>

              <div className="form-field full">
                <label htmlFor="code">
                  Yetki kodu *
                </label>

                <input
                  id="code"
                  value={form.code}
                  onChange={(event) =>
                    updateField(
                      "code",
                      normalizeCode(
                        event.target.value
                      )
                    )
                  }
                  placeholder="CUSTOMERS.READ"
                  disabled={isSaving}
                  required
                />

                <span>
                  Örn. CUSTOMERS.READ,
                  CUSTOMERS.CREATE veya
                  CUSTOMERS.UPDATE
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
                  rows={6}
                  placeholder="Bu yetkinin hangi işlemlere erişim sağladığını açıklayın..."
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="permission-create-preview">
              <div className="permission-icon">
                ⛨
              </div>

              <div>
                <span>
                  Yetki önizlemesi
                </span>

                <strong>
                  {form.name.trim() ||
                    "Yeni sistem yetkisi"}
                </strong>

                <code>
                  {normalizeCode(form.code) ||
                    "MODULE.ACTION"}
                </code>

                <small>
                  {normalizeModule(
                    form.module
                  ) || "MODULE"}
                </small>
              </div>
            </div>

            <div className="company-form-help">
              <span>i</span>

              <p>
                Yetki kodu sistem genelinde
                benzersiz olmalıdır. Yetki
                oluşturulduktan sonra rol
                bağlantıları yetki detay veya
                rol yönetim ekranından
                tanımlanacaktır.
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
              href="/settings/permissions"
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
                : "Yetkiyi oluştur"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
