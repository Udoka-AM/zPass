import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">How it works</h1>
      <Placeholder screen="S17 Threat model" task="5.2" />
    </div>
  );
}
