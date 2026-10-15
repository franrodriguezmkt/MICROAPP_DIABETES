import { NavLink, Outlet } from "react-router-dom";

import { AppIcon, type AppIconName } from "./AppIcon";
import { BrandMark } from "./BrandMark";

const navigation = [
  { to: "/semana", label: "Semana", icon: "week" },
  { to: "/compras", label: "Compras", icon: "shopping" },
  { to: "/recetas", label: "Recetas", icon: "recipes" },
  { to: "/recursos", label: "Recursos", icon: "resources" },
  { to: "/cuenta", label: "Cuenta", icon: "account" },
] as const satisfies ReadonlyArray<{
  to: string;
  label: string;
  icon: AppIconName;
}>;

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="app-sidebar">
        <header className="app-header">
          <BrandMark className="brand-mark" />
          <div className="brand-copy">
            <p className="eyebrow">Recetas para organizarte</p>
            <p className="brand-name">Mi semana de recetas</p>
          </div>
        </header>

        <nav className="app-navigation" aria-label="Navegación principal">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item${isActive ? " nav-item--active" : ""}`
              }
            >
              <AppIcon name={item.icon} className="nav-item__icon" />
              <span className="nav-item__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main id="main-content" className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
