import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "Create a poll" };

export default function NewPollPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">Create a poll</h1>
      <Placeholder screen="S13 Create poll" task="3.5" />
    </div>
  );
}
