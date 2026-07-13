"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5062/api/v1";

interface DashboardData {
  generatedAt: string;
  counters: {
    activeCustomerCount: number;
    activeProductCount: number;
    lowStockProductCount: number;
  };
  todayVisits: {
    total: number;
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    missed: number;
  };
  allVisits: {
    planned: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    missed: number;
  };
  upcomingVisits: VisitItem[];
  recentlyCompletedVisits: VisitItem[];
  lowStockProducts: ProductItem[];
}

interface VisitItem {
  id: string;
  companyName: string;
  customerName: string;
  assignedUserName: string;
  title: string;
  plannedStartAt: string;
  plannedEndAt: string;
  statusName: string;
  outcome?: string | null;
}

interface ProductItem {
  id: string;
  companyName: string;
  name: string;
  code: string;
  unit: string;
  stockQuantity: number;
  minimumStockQuantity: number;
}

interface UserData {
  firstName: string;
  lastName: string;
  roles: string[];
}

export default function DashboardPage() {
  const router = useRouter();

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const token =
      localStorage.getItem("saharut_access_token");

    const storedUser =
      localStorage.getItem("saharut_user");

    if (!token) {
      router.replace("/");
      return;
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("saharut_user");
      }
    }

    async function loadDashboard() {
      try {
        const response = await fetch(
          `${API_URL}/dashboard/summary`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.clear();
          router.replace("/");
          return;
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Dashboard verileri alınamadı."
          );
        }

        setDashboard(result.data);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Beklenmeyen bir hata oluştu."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("saharut_access_token");
    localStorage.removeItem("saharut_token_expires_at");
    localStorage.removeItem("saharut_user");

    router.replace("/");
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  }

  if (isLoading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Dashboard hazırlanıyor...</p>
      </main>
    );
  }

  if (error || !dashboard) {
    return (
      <main className="dashboard-error">
        <h1>Dashboard yüklenemedi</h1>
        <p>{error}</p>

        <button onClick={() => location.reload()}>
          Tekrar dene
        </button>
      </main>
    );
  }

  return (
    <main className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">S</div>

          <div>
            <strong>Saharut</strong>
            <span>Operasyon Platformu</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a className="active" href="/dashboard">
            <span>⌂</span>
            Dashboard
          </a>

          <a href="#">
            <span>▣</span>
            Firmalar
          </a>

          <a href="#">
            <span>♙</span>
            Müşteriler
          </a>

          <a href="#">
            <span>□</span>
            Ürünler
          </a>

          <a href="#">
            <span>◇</span>
            Ziyaretler
          </a>

          <a href="#">
            <span>◉</span>
            Kullanıcılar
          </a>

          <a href="#">
            <span>⚙</span>
            Ayarlar
          </a>
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>

          <div>
            <strong>
              {user
                ? `${user.firstName} ${user.lastName}`
                : "Kullanıcı"}
            </strong>

            <span>
              {user?.roles?.[0] ?? "Kullanıcı"}
            </span>
          </div>
        </div>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="page-label">
              Operasyon Merkezi
            </span>

            <h1>Dashboard</h1>

            <p>
              Saha satış operasyonlarınızın güncel özeti.
            </p>
          </div>

          <div className="header-actions">
            <div className="current-date">
              {new Intl.DateTimeFormat(
                "tr-TR",
                { dateStyle: "full" }
              ).format(new Date())}
            </div>

            <button
              className="logout-button"
              onClick={handleLogout}
            >
              Çıkış yap
            </button>
          </div>
        </header>

        <section className="stat-grid">
          <article className="stat-card">
            <div className="stat-icon customer">
              ♙
            </div>

            <div>
              <span>Aktif müşteriler</span>
              <strong>
                {dashboard.counters.activeCustomerCount}
              </strong>
              <small>Müşteri portföyü</small>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon product">
              □
            </div>

            <div>
              <span>Aktif ürünler</span>
              <strong>
                {dashboard.counters.activeProductCount}
              </strong>
              <small>Ürün kataloğu</small>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon visit">
              ◇
            </div>

            <div>
              <span>Bugünkü ziyaretler</span>
              <strong>
                {dashboard.todayVisits.total}
              </strong>
              <small>
                {dashboard.todayVisits.completed} tamamlandı
              </small>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon stock">
              !
            </div>

            <div>
              <span>Düşük stok</span>
              <strong>
                {dashboard.counters.lowStockProductCount}
              </strong>
              <small>Kontrol gerekli</small>
            </div>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel visit-summary-panel">
            <div className="panel-header">
              <div>
                <h2>Bugünkü ziyaret özeti</h2>
                <p>Ziyaret durumlarının dağılımı</p>
              </div>

              <span className="panel-total">
                {dashboard.todayVisits.total} ziyaret
              </span>
            </div>

            <div className="visit-status-grid">
              <div>
                <span className="status-dot planned" />
                <p>Planlandı</p>
                <strong>
                  {dashboard.todayVisits.planned}
                </strong>
              </div>

              <div>
                <span className="status-dot progress" />
                <p>Devam ediyor</p>
                <strong>
                  {dashboard.todayVisits.inProgress}
                </strong>
              </div>

              <div>
                <span className="status-dot completed" />
                <p>Tamamlandı</p>
                <strong>
                  {dashboard.todayVisits.completed}
                </strong>
              </div>

              <div>
                <span className="status-dot cancelled" />
                <p>İptal edildi</p>
                <strong>
                  {dashboard.todayVisits.cancelled}
                </strong>
              </div>
            </div>
          </article>

          <article className="panel quick-actions-panel">
            <div className="panel-header">
              <div>
                <h2>Hızlı işlemler</h2>
                <p>Sık kullanılan işlemler</p>
              </div>
            </div>

            <div className="quick-actions">
              <button>
                <span>＋</span>
                Yeni ziyaret planla
              </button>

              <button>
                <span>＋</span>
                Yeni müşteri ekle
              </button>

              <button>
                <span>＋</span>
                Yeni ürün ekle
              </button>
            </div>
          </article>
        </section>

        <section className="dashboard-grid lower-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Yaklaşan ziyaretler</h2>
                <p>Planlanan saha görüşmeleri</p>
              </div>

              <button className="text-button">
                Tümünü gör
              </button>
            </div>

            {dashboard.upcomingVisits.length === 0 ? (
              <div className="empty-state">
                <span>◇</span>
                <strong>Yaklaşan ziyaret yok</strong>
                <p>
                  Yeni bir ziyaret planlandığında burada
                  görüntülenecek.
                </p>
              </div>
            ) : (
              <div className="visit-list">
                {dashboard.upcomingVisits.map(
                  (visit) => (
                    <div
                      className="visit-row"
                      key={visit.id}
                    >
                      <div className="visit-date">
                        <strong>
                          {new Date(
                            visit.plannedStartAt
                          ).getDate()}
                        </strong>

                        <span>
                          {new Intl.DateTimeFormat(
                            "tr-TR",
                            { month: "short" }
                          ).format(
                            new Date(
                              visit.plannedStartAt
                            )
                          )}
                        </span>
                      </div>

                      <div className="visit-info">
                        <strong>{visit.title}</strong>
                        <span>
                          {visit.customerName}
                        </span>
                      </div>

                      <div className="visit-time">
                        {formatDate(
                          visit.plannedStartAt
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Son tamamlanan ziyaretler</h2>
                <p>En güncel saha sonuçları</p>
              </div>
            </div>

            {dashboard.recentlyCompletedVisits.length ===
            0 ? (
              <div className="empty-state">
                <span>✓</span>
                <strong>Tamamlanan ziyaret yok</strong>
              </div>
            ) : (
              <div className="visit-list">
                {dashboard.recentlyCompletedVisits.map(
                  (visit) => (
                    <div
                      className="visit-row"
                      key={visit.id}
                    >
                      <div className="completed-icon">
                        ✓
                      </div>

                      <div className="visit-info">
                        <strong>{visit.title}</strong>
                        <span>
                          {visit.customerName}
                        </span>
                      </div>

                      <div className="visit-time">
                        Tamamlandı
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
