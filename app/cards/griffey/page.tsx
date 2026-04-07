import PublicNav from "../../components/PublicNav";
import PublicCardDatabase from "../../components/PublicCardDatabase";

export default function GriffeyPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <PublicCardDatabase
        title="Griffey"
        set="Griffey"
        file="/boba-checklist.csv"
        color="#fb923c"
        description="The original BOBA set featuring Ken Griffey Jr. as the hero inspiration."
      />
    </div>
  );
}