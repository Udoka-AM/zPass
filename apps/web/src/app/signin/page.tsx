import { Placeholder } from "@/components/placeholder";

export const metadata = { title: "Sign in with zPass" };

export default function SignInPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-[34px] font-semibold">Sign in with zPass</h1>
      <Placeholder screen="S12 Sign in" task="4.3" />
    </div>
  );
}
