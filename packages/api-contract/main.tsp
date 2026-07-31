import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Keys API" })
@info(#{ version: "1.0.0" })
@doc("Read access to pull request data.")
namespace KeysApi;

@doc("The account that opened a pull request.")
model Author {
  @doc("The account's username.")
  username: string;

  @doc("URL of the account's avatar image.")
  profileImage: url;
}

@doc("The repository a pull request belongs to.")
model Repository {
  @doc("The account or organisation that owns the repository.")
  owner: string;

  @doc("The repository name, without the owner prefix.")
  name: string;
}

@doc("A pull request.")
model PullRequest {
  @doc("Identifier for the pull request.")
  id: string;

  @doc("The pull request title.")
  title: string;

  @doc("The lifecycle state of a pull request.")
  state: "open" | "closed";

  author: Author;
  repository: Repository;

  @doc("URL of the pull request.")
  url: url;

  createdAt: utcDateTime;
  updatedAt: utcDateTime;
}

@doc("A single page of results, addressed by an opaque cursor.")
@friendlyName("{name}Page", Item)
model Page<Item> {
  @doc("The items in this page, ordered newest first.")
  items: Item[];

  @doc("Cursor to pass as `cursor` to fetch the next page. Null on the last page.")
  nextCursor: string | null;
}

@error
@doc("An error returned by the API.")
model ApiError {
  @doc("Human-readable description of what went wrong.")
  message: string;
}

@summary("List pull requests")
@doc("Returns a cursor-paginated list of pull requests, newest first.")
@route("/pull-requests")
@operationId("listPullRequests")
@get
op listPullRequests(
  @doc("Opaque cursor from a previous response's `nextCursor`.")
  @query
  cursor?: string,

  @doc("Filter by pull request state. Defaults to `all`.")
  @query()
  state?: "open" | "closed" | "all" = "all",

  @doc("Maximum number of items to return.")
  @minValue(1)
  @maxValue(100)
  @query
  limit?: int32 = 10,
): Page<PullRequest> | ApiError;
