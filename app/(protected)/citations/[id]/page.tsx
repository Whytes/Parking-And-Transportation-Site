import { redirect } from "next/navigation";

export default async function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/citations?record=${id}`);
}
