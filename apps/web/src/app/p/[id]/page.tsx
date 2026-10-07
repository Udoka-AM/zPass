import { Placeholder } from "@/components/placeholder";

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">
        Poll <span className="num">{id}</span>
      </h1>
      <Placeholder screen="S11 Poll" task="3.5" />
    </div>
  );
}
