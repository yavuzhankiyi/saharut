"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface UserData {
  firstName?: string;
  lastName?: string;
  roles?: string[];
}

const navigationItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "⌂",
  },
  {
    href: "/companies",
    label: "Firmalar",
    icon: "▣",
  },
  {
    href: "/customers",
    label: "Müşteriler",
    icon: "♙",
  },
  {
    href: "/products",
    label: "Ürünler",
    icon: "□",
  },
  {
    href: "/visits",
    label: "Ziyaretler",
    icon: "◇",
  },
  {
    href: "/users",
    label: "Kullanıcılar",
    icon: "◉",
  },
  {
    href: "/settings",
    label: "Ayarlar",
    icon: "⚙",
  },
];

export default function AppSidebar() {
  const pathname = usePathname();

  const [user, setUser] =
    useState<UserData | null>(null);

  useEffect(() => {
    const storedUser =
      localStorage.getItem("saharut_user");

    if (!storedUser) {
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem("saharut_user");
    }
  }, []);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  const firstInitial =
    user?.firstName?.charAt(0) ?? "";

  const lastInitial =
    user?.lastName?.charAt(0) ?? "";

  const fullName =
    user?.firstName || user?.lastName
      ? `${user?.firstName ?? ""} ${
          user?.lastName ?? ""
        }`.trim()
      : "Kullanıcı";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          S
        </div>

        <div>
          <strong>Saharut</strong>

          <span>
            Operasyon Platformu
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive(item.href)
                ? "active"
                : undefined
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">
          {firstInitial}
          {lastInitial}
        </div>

        <div>
          <strong>{fullName}</strong>

          <span>
            {user?.roles?.[0] ??
              "Kullanıcı"}
          </span>
        </div>
      </div>
    </aside>
  );
}
