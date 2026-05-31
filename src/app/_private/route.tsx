import { ProfileProvider } from "@/components/sidebar/profile-context";
import { environmentManager } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_private")({
  component: RouteComponent,
  beforeLoad: ({ context, location }) => {
    if (environmentManager.isServer() && !context.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  loader: (opts) => {
    opts.context.queryClient.prefetchQuery(
      convexQuery(api.users.getUserProfile, {}),
    );
  },
});

function RouteComponent() {
  const { data, isPending } = useQuery(
    convexQuery(api.users.getUserProfile, {}),
  );

  return (
    <ProfileProvider profile={data} isPending={isPending}>
      <Outlet />
    </ProfileProvider>
  );
}
