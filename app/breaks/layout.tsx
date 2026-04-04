import Sidebar from "../Sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
        {children}
      </div>
    </div>
  );
}