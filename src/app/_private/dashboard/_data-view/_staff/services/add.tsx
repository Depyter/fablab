import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_private/dashboard/_data-view/_staff/services/add',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_private/dashboard/_data-view/_staff/services/add"!</div>
}
