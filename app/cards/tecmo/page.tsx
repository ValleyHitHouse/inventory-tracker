import PublicNav from "../../components/PublicNav";
import PublicCardDatabase from "../../components/PublicCardDatabase";

export default function TecmoPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <PublicCardDatabase
        title="Tecmo"
        set="Tecmo"
        file="/tecmo-checklist.csv"
        color="#4ade80"
        description="The Tecmo set for Bo Jackson Battle Arena."
      />
    </div>
  );
}
