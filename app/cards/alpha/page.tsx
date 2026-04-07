import PublicNav from "../../components/PublicNav";
import PublicCardDatabase from "../../components/PublicCardDatabase";

export default function AlphaPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <PublicCardDatabase
        title="Alpha"
        set="Alpha"
        file="/alpha-boba-checklist.csv"
        color="#a78bfa"
        description="The Alpha expansion set for Bo Jackson Battle Arena."
      />
    </div>
  );
}