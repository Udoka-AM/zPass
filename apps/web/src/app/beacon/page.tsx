import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "Beacon" };

export default function BeaconPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">Beacon</h1>
      <Placeholder screen="S15 Beacon explorer" task="4.5" />
    </div>
  );
}
