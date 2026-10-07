import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "Developers" };

export default function DevelopersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">Developers</h1>
      <Placeholder screen="S16 Developers" task="4.5" />
    </div>
  );
}
