import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "Join the holders chat" };

// The session id is single-use and carries no Telegram user id (docs/03-APP-FLOW.md §3.6).
export default async function TelegramProvePage({
  params,
}: {
  params: Promise<{ session: string }>;
}) {
  await params;
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">Join the holders chat</h1>
      <Placeholder screen="S10 Telegram prove" task="3.7" />
    </div>
  );
}
