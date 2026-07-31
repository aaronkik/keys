import { useListPullRequests } from "./generated/api";

/**
 * Reads the API through the client orval generated from the same OpenAPI
 * document the backend is built from, so the types here and the handler
 * signatures over there cannot drift apart.
 */
export function PullRequestList() {
  const { data, isPending, isError, error } = useListPullRequests({ limit: 20 });

  if (isPending) return <p>Loading pull requests…</p>;
  if (isError) {
    return <p role="alert">Could not load pull requests: {error.message}</p>;
  }

  // The generated fetch client resolves with the response envelope instead of
  // throwing on a non-2xx status, so failures are checked explicitly.
  if (data.status !== 200) {
    return <p role="alert">Could not load pull requests (HTTP {data.status}).</p>;
  }

  return (
    <ul>
      {data.data.items.map((pullRequest) => (
        <li key={pullRequest.id}>
          <a href={pullRequest.url}>
            #{pullRequest.number} {pullRequest.title}
          </a>{" "}
          <span>
            {pullRequest.state} · {pullRequest.repository.owner}/{pullRequest.repository.name} ·{" "}
            {pullRequest.author.login}
          </span>
        </li>
      ))}
    </ul>
  );
}
