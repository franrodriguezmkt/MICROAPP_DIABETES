import { NavLink } from "react-router-dom";

export function WeekSectionNav() {
  return (
    <nav className="week-section-nav" aria-label="Secciones de Semana">
      <NavLink
        className={({ isActive }) =>
          `week-section-nav__link${isActive ? " week-section-nav__link--active" : ""}`
        }
        end
        to="/semana"
      >
        Crear semana
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          `week-section-nav__link${isActive ? " week-section-nav__link--active" : ""}`
        }
        to="/mis-semanas"
      >
        Mis Semanas
      </NavLink>
    </nav>
  );
}
