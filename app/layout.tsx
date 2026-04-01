import type { Metadata } from "next";
import Sidebar from "./Sidebar";

export const metadata: Metadata = {
  title: "ValleyHitHouse",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#0a0a0a", color: "#e5e5e5", display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
          {children}
        </div>
      </body>
    </html>
  );
}