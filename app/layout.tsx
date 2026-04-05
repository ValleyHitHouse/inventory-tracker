"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#0a0a0a", color: "#e5e5e5" }}>
        <Inner>{children}</Inner>
      </body>
    </html>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSellerPage = pathname?.startsWith("/lot-comp/") && pathname !== "/lot-comp";

  if (isSellerPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <div
        className="vhh-main"
        style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}
      >
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
    </>
  );
}