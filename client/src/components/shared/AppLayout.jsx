import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import NotificationBell from '../NotificationBell';
import LanguagePicker from './LanguagePicker';
import { C } from './theme';

const NAV_ITEMS = [
  { key: 'dashboard',   icon: '📊', labelKey: 'nav.dashboard',    path: '/collector' },
  { key: 'logNew',      icon: '➕', labelKey: 'nav.logWaste',     path: '/collector/log-new' },
  { key: 'logs',        icon: '📋', labelKey: 'nav.myLogs',       path: '/collector/logs' },
  { key: 'leaderboard', icon: '🏆', labelKey: 'nav.leaderboard',  path: '/collector/leaderboard' },
  { key: 'earnings',    icon: '💰', labelKey: 'nav.myEarnings',   path: '/collector/earnings' },
  { key: 'matches',     icon: '🤝', labelKey: 'nav.buyerMatches', path: '/collector/matches' },
];

const css = `
  *, *::before, *::after { box-sizing: border-box; }

  .cd-root {
    min-height: 100vh;
    background: ${C.bg};
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
    display: flex;
  }

  .cd-sidebar {
    width: 240px; flex-shrink: 0;
    background: ${C.primary};
    display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0;
    z-index: 200;
    box-shadow: 2px 0 8px rgba(0,0,0,0.12);
  }
  .cd-sidebar-header { padding: 24px 20px 20px; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .cd-logo-mark {
    display: flex; align-items: center; gap: 10px;
    font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 12px;
  }
  .cd-logo-icon {
    width: 34px; height: 34px; background: rgba(255,255,255,0.2);
    border-radius: 9px; display: flex; align-items: center; justify-content: center;
    font-size: 16px; flex-shrink: 0;
  }
  .cd-greeting { font-size: 13px; color: rgba(255,255,255,0.6); font-weight: 400; line-height: 1.4; }
  .cd-greeting strong { color: rgba(255,255,255,0.92); font-weight: 600; }

  .cd-nav {
    flex: 1; padding: 16px 12px;
    display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
  }
  .cd-nav-item {
    display: flex; align-items: center; gap: 11px;
    padding: 11px 14px; border-radius: 10px; border: none;
    background: transparent; color: rgba(255,255,255,0.65);
    font-size: 14px; font-weight: 600; cursor: pointer;
    text-align: left; width: 100%;
    transition: background 0.15s, color 0.15s; font-family: inherit;
  }
  .cd-nav-item:hover  { background: rgba(255,255,255,0.1); color: #fff; }
  .cd-nav-item.active { background: rgba(255,255,255,0.18); color: #fff; }
  .cd-nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
  .cd-sidebar-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,0.12); }
  .cd-lang-row { padding: 10px 12px 4px; display: flex; justify-content: center; }
  .cd-nav-logout { color: rgba(255,255,255,0.6); }
  .cd-nav-logout:hover { background: rgba(255,255,255,0.08); color: #fff; }

  .cd-content { margin-left: 240px; flex: 1; min-width: 0; }
  .cd-main { margin: 0 auto; padding: 36px 32px 56px; }

  .cd-back-row { margin-bottom: 16px; }
  .cd-back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; cursor: pointer; padding: 0;
    color: ${C.muted}; font-size: 13px; font-weight: 600; font-family: inherit;
  }
  .cd-back-btn:hover { color: ${C.primary}; }

  .cd-mobile-top { display: none; }
  .cd-mobile-header {
    background: ${C.primary}; padding: 14px 16px;
    display: flex; align-items: center; justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12); position: sticky; top: 0; z-index: 100;
  }
  .cd-mobile-logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 15px; font-weight: 700; color: #fff;
  }
  .cd-mobile-logo-icon {
    width: 30px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .cd-mobile-btn {
    padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.35);
    background: transparent; color: rgba(255,255,255,0.85); font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.15s;
  }
  .cd-mobile-btn:hover { background: rgba(255,255,255,0.12); }

  @media (max-width: 767px) {
    .cd-sidebar    { display: none; }
    .cd-content    { margin-left: 0; }
    .cd-mobile-top { display: block; }
    .cd-main       { padding: 20px 16px 48px; }
  }
`;

/**
 * Shared collector shell: sidebar nav (desktop) / top bar (mobile), replacing
 * the near-identical sidebar duplicated across Dashboard, LogNew, AllLogs,
 * Leaderboard, and BuyerMatches. Buyer/coordinator/admin dashboards have a
 * different sidebar shape and are out of scope here.
 */
export default function AppLayout({ active, children, extraSidebarContent, maxWidth = 1100 }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const activeItem = NAV_ITEMS.find(i => i.key === active);

  function handleLogout() {
    navigate('/', { replace: true });
    logout();
  }

  function handleBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/collector');
  }

  return (
    <>
      <style>{css}</style>
      <div className="cd-root">

        {/* ── Sidebar (desktop) ── */}
        <aside className="cd-sidebar">
          <div className="cd-sidebar-header">
            <div className="cd-logo-mark">
              <div className="cd-logo-icon">♻</div>
              WasteManagement
            </div>
            <p className="cd-greeting">
              Hello, <strong>{user?.name ?? 'Collector'}</strong>
            </p>
          </div>

          <nav className="cd-nav">
            {NAV_ITEMS.map(item => {
              const button = (
                <button
                  key={item.key}
                  className={`cd-nav-item${item.key === active ? ' active' : ''}`}
                  onClick={item.key === active ? undefined : () => navigate(item.path)}
                >
                  <span className="cd-nav-icon">{item.icon}</span>
                  {t(item.labelKey)}
                </button>
              );
              // NotificationBell sits right after "Log Waste", matching where
              // every page placed it before this component existed.
              if (item.key !== 'logNew') return button;
              return [button, <NotificationBell key="notif" />];
            })}
          </nav>

          {extraSidebarContent}

          <div className="cd-lang-row">
            <LanguagePicker />
          </div>

          <div className="cd-sidebar-footer">
            <button className="cd-nav-item cd-nav-logout" onClick={handleLogout}>
              <span className="cd-nav-icon">🚪</span>
              {t('common.logout')}
            </button>
          </div>
        </aside>

        {/* ── Mobile top bar ── */}
        <div className="cd-mobile-top">
          <div className="cd-mobile-header">
            <div className="cd-mobile-logo">
              <div className="cd-mobile-logo-icon">♻</div>
              {activeItem ? t(activeItem.labelKey) : 'WasteManagement'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {active !== 'dashboard' && (
                <button className="cd-mobile-btn" onClick={handleBack}>
                  ← {t('nav.dashboard')}
                </button>
              )}
              <button className="cd-mobile-btn" onClick={handleLogout}>
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="cd-content">
          <main className="cd-main" style={{ maxWidth }}>
            {active !== 'dashboard' && (
              <div className="cd-back-row">
                <button className="cd-back-btn" onClick={handleBack}>
                  ← {t('common.back')}
                </button>
              </div>
            )}
            {children}
          </main>
        </div>

      </div>
    </>
  );
}
