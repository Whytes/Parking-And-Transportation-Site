import { redirect } from "next/navigation";

export default async function PlatesPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string; plate?: string }>;
}) {
  const params = await searchParams;
  const query = params.plate ? `?search=${encodeURIComponent(params.plate)}` : "";
  redirect(`/citations${query}`);
}
