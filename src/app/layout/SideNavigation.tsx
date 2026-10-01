import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { modules, navigationGroups } from '../navigation'
export function SideNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const auth = useAuth()
  const visible = modules.filter(
    (module) =>
      module.phase === 0 ||
      (module.phase === 1 &&
        [
          'SETTINGS_READ',
          'USERS_READ',
          'ROLES_READ',
          'DENTISTS_READ',
          'SERVICES_READ',
          'SCHEDULES_READ',
          'AUDIT_READ',
        ].some(auth.can)) ||
      (module.phase > 1 && auth.session?.user?.roles.includes('ADMIN')),
  )
  return (
    <nav aria-label="Navegación principal" className="space-y-6 px-4">
      {navigationGroups
        .filter((group) => visible.some((module) => module.group === group))
        .map((group) => (
          <div key={group}>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
              {group}
            </p>
            <div className="space-y-1">
              {visible
                .filter((module) => module.group === group)
                .map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-muted hover:bg-canvas hover:text-ink'}`
                    }
                  >
                    <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
                    {label}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
    </nav>
  )
}
