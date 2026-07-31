import { createFileRoute } from "@tanstack/react-router";

import { PullRequestList } from "../pull-request-list";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main>
      <h1>Pull requests</h1>
      <PullRequestList />
    </main>
  );
}
