import { redirect } from 'next/navigation';

interface GuestRedirectProps {
  params: { workspaceId: string };
}

export default function GuestRedirect({ params }: GuestRedirectProps) {
  redirect(`/p/${params.workspaceId}`);
}
