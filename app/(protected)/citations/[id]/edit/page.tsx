import { redirect } from "next/navigation";

export default async function EditRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/citations?record=${id}&mode=edit`);
}
