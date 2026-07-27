import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { useAuth } from "../AuthContext";

const NAV_ITEMS = [
  { label: "Home", to: "/", icon: "grid_view" },
  { label: "Library", to: "/library", icon: "menu_book" },
  { label: "Workshop", to: "/workshop", icon: "workspaces" },
];

function initials(user) {
  const source = user?.displayName || user?.email || "";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      <header className="border-b border-outline-variant bg-surface-container-lowest px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg tracking-tight">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-white"
            >
              <Icon name="psychology" className="text-[18px]" />
            </span>
            Principle Pitch
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                    active
                      ? "text-on-surface border-primary"
                      : "text-on-surface-variant border-transparent hover:text-on-surface"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Icon name="notifications" className="text-on-surface-variant" />
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-semibold overflow-hidden"
              title={user?.displayName || user?.email || "Account"}
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                initials(user)
              )}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg py-2 z-30">
                <div className="px-4 py-2 border-b border-outline-variant">
                  <p className="text-sm font-semibold text-on-surface truncate">
                    {user?.displayName || "Account"}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                </div>
                <Link
                  to="/billing"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2"
                >
                  <Icon name="workspace_premium" className="text-[18px]" />
                  Plan & billing
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container flex items-center gap-2"
                >
                  <Icon name="logout" className="text-[18px]" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
