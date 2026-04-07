"use client";
import { usePathname } from "next/navigation";
import DashboardSidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/dashboard/login") {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DashboardSidebar />
      <div className="vhh-main" style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
        {children}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .vhh-main {
            margin-left: 0 !important;
            padding-top: 56px;
          }
        }
      `}</style>
    </div>
  );
}