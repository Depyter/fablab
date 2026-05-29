import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_private/dashboard/_data-view/workshops',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_private/dashboard/_data-view/workshops"!</div>
}
