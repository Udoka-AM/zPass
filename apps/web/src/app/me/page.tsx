import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "My passes" };

export default function MyPassesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">My passes</h1>
      <Placeholder screen="S7 Dashboard" task="4.2" />
    </div>
  );
}
