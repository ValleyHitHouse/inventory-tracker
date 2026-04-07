import PublicNav from "../../components/PublicNav";
import PublicCardDatabase from "../../components/PublicCardDatabase";

export default function AlphaUpdatePage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#e5e5e5", fontFamily: "sans-serif" }}>
      <PublicNav />
      <PublicCardDatabase
        title="Alpha Update"
        set="Alpha Update"
        file="/alpha-update-boba-checklist.csv"
        color="#38bdf8"
        description="The Alpha Update expansion for Bo Jackson Battle Arena."
      />
    </div>
  );
}