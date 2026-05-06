import { redirect } from "next/navigation";

type NewsRedirectProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NewsItemRedirect({ params }: NewsRedirectProps) {
  const { id } = await params;

  redirect(`/ru/news/show/${id}`);
}
