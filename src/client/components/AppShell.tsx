import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  { to: "/semana", label: "Semana" },
  { to: "/compras", label: "Compras" },
  { to: "/recetas", label: "Recetas" },
  { to: "/recursos", label: "Recursos" },
  { to: "/cuenta", label: "Cuenta" },
] as const;

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="eyebrow">Recetas para organizarte</p>
          <p className="brand-name">Mi semana de recetas</p>
        </div>
      </header>

      <main id="main-content" className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-navigation" aria-label="Navegación principal">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item${isActive ? " nav-item--active" : ""}`
            }
          >
            <span className="nav-indicator" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
