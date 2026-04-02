export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: 0, padding: 0, background: "#0a0a0a", minHeight: "100vh" }}>
      {children}
    </div>
  );
}