"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

type LoginStep = "phone" | "otp" | "success";

interface SendOtpResponse {
  success: boolean;
  message?: string | null;
  data?: {
    expiresInSeconds: number;
    developmentCode?: string | null;
  };
}

interface VerifyOtpResponse {
  success: boolean;
  message?: string | null;
  remainingAttempts?: number;
  data?: {
    accessToken: string;
    expiresAt: string;
    tokenType: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email?: string | null;
      roles: string[];
    };
  };
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("90") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 10) {
    return `0${digits}`;
  }

  return digits;
}

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [userName, setUserName] = useState("");

  async function handleSendOtp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const normalizedPhoneNumber =
      normalizePhoneNumber(phoneNumber);

    if (normalizedPhoneNumber.length !== 11) {
      setMessage(
        "Telefon numarasını 05551112233 biçiminde girin."
      );
      setIsError(true);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_URL}/auth/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            phoneNumber: normalizedPhoneNumber,
          }),
        }
      );

      const result =
        (await response.json()) as SendOtpResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Doğrulama kodu gönderilemedi."
        );
      }

      setPhoneNumber(normalizedPhoneNumber);

      setDevelopmentCode(
        result.data?.developmentCode ?? ""
      );

      setMessage(
        result.message ??
          "Doğrulama kodu oluşturuldu."
      );

      setStep("otp");
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

  async function handleVerifyOtp(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    if (otpCode.trim().length !== 6) {
      setMessage(
        "Doğrulama kodu 6 haneli olmalıdır."
      );
      setIsError(true);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_URL}/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            phoneNumber,
            code: otpCode.trim(),
          }),
        }
      );

      const result =
        (await response.json()) as VerifyOtpResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data
      ) {
        throw new Error(
          result.message ??
            "Doğrulama işlemi başarısız oldu."
        );
      }

      localStorage.setItem(
        "saharut_access_token",
        result.data.accessToken
      );

      localStorage.setItem(
        "saharut_token_expires_at",
        result.data.expiresAt
      );

      localStorage.setItem(
        "saharut_user",
        JSON.stringify(result.data.user)
      );

      setUserName(
        `${result.data.user.firstName} ${result.data.user.lastName}`
      );

      setMessage(
        result.message ??
          "Giriş işlemi başarılı."
      );

      setStep("success");
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

  function handleBackToPhone() {
    setStep("phone");
    setOtpCode("");
    setDevelopmentCode("");
    setMessage("");
    setIsError(false);
  }

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="brand">
          <div className="brand-logo">S</div>

          <div>
            <h1>Saharut</h1>
            <p>Saha satış ve operasyon platformu</p>
          </div>
        </div>

        <div className="hero">
          <span className="hero-badge">
            B2B Satış Operasyonları
          </span>

          <h2>
            Saha ekibinizi
            <strong> tek merkezden yönetin.</strong>
          </h2>

          <p>
            Müşterilerinizi, ürünlerinizi ve saha
            ziyaretlerinizi kolayca yönetin.
          </p>

          <div className="features">
            <article>
              <span>01</span>

              <div>
                <h3>Ziyaret Yönetimi</h3>
                <p>
                  Planlama, check-in ve check-out süreçleri
                </p>
              </div>
            </article>

            <article>
              <span>02</span>

              <div>
                <h3>Müşteri Takibi</h3>
                <p>
                  Firma ve müşteri bilgilerini yönetin
                </p>
              </div>
            </article>

            <article>
              <span>03</span>

              <div>
                <h3>Operasyon Özeti</h3>
                <p>
                  Anlık veriler ve performans göstergeleri
                </p>
              </div>
            </article>
          </div>
        </div>

        <footer>© 2026 Saharut</footer>
      </section>

      <section className="login-right">
        <div className="login-card">
          {step === "phone" && (
            <>
              <span className="login-label">
                Hesabınıza giriş yapın
              </span>

              <h2>Tekrar hoş geldiniz</h2>

              <p className="login-description">
                Telefon numaranızı girin. Size tek
                kullanımlık doğrulama kodu gönderelim.
              </p>

              <form onSubmit={handleSendOtp}>
                <label htmlFor="phoneNumber">
                  Telefon numarası
                </label>

                <div className="phone-box">
                  <span>+90</span>

                  <input
                    id="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="555 111 22 33"
                    value={phoneNumber}
                    onChange={(event) =>
                      setPhoneNumber(event.target.value)
                    }
                    disabled={isLoading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Kod gönderiliyor..."
                    : "Doğrulama kodu gönder"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <span className="login-label">
                Telefon doğrulama
              </span>

              <h2>Kodu girin</h2>

              <p className="login-description">
                <strong>{phoneNumber}</strong> numarasına
                ait 6 haneli doğrulama kodunu girin.
              </p>

              {developmentCode && (
                <div className="development-code">
                  <span>Geliştirme kodu</span>
                  <strong>{developmentCode}</strong>
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <label htmlFor="otpCode">
                  Doğrulama kodu
                </label>

                <input
                  id="otpCode"
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(event) =>
                    setOtpCode(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  disabled={isLoading}
                  required
                />

                <button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Doğrulanıyor..."
                    : "Giriş yap"}
                </button>
              </form>

              <button
                className="secondary-button"
                type="button"
                onClick={handleBackToPhone}
                disabled={isLoading}
              >
                Telefon numarasını değiştir
              </button>
            </>
          )}

          {step === "success" && (
            <div className="success-state">
              <div className="success-icon">✓</div>

              <span className="login-label">
                Giriş başarılı
              </span>

              <h2>Hoş geldin, {userName}</h2>

              <p className="login-description">
                Kimliğiniz başarıyla doğrulandı. Yönetim
                panelini sonraki adımda açacağız.
              </p>

              <button
                type="button"
                onClick={() => router.push("/dashboard")}
              >
                Yönetim paneline geç
              </button>
            </div>
          )}

          {message && (
            <div
              className={
                isError
                  ? "form-message error"
                  : "form-message success"
              }
            >
              {message}
            </div>
          )}

          {step !== "success" && (
            <div className="security-box">
              <span>✓</span>

              <p>
                Giriş işlemleriniz tek kullanımlık
                doğrulama koduyla korunur.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
