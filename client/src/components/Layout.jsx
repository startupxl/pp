import { Link, useLocation } from "react-router-dom";
import Icon from "./Icon";

const NAV_ITEMS = [
  { label: "Home", to: "/", icon: "grid_view" },
  { label: "Library", to: "/library", icon: "menu_book" },
  { label: "Workshop", to: "/workshop", icon: "workspaces" },
];

export default function Layout({ children }) {
  const location = useLocation();

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
          <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-semibold">
            AR
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
