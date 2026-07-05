import type {
  DataSourceAdapter,
  DataSourceResult,
  MarketSignal,
} from "@/lib/data-sources/types";
import { fetchJson } from "@/lib/data-sources/utils";

interface GitHubRepository {
  full_name: string;
  html_url: string;
  pushed_at: string;
  stargazers_count: number;
  open_issues_count: number;
}

const TRACKED_REPOS = [
  {
    repo: "ritual-foundation/ritual-dapp-skills",
    category: "Ritual" as const,
    label: "Ritual dApp Skills",
  },
  {
    repo: "openai/openai-node",
    category: "AI" as const,
    label: "OpenAI Node SDK",
  },
  {
    repo: "ethereum/go-ethereum",
    category: "On-chain" as const,
    label: "go-ethereum",
  },
];

export const githubAdapter: DataSourceAdapter = {
  id: "github",
  async collect(now): Promise<DataSourceResult> {
    const settled = await Promise.allSettled(
      TRACKED_REPOS.map(async (tracked) => {
        const repo = await fetchJson<GitHubRepository>(
          `https://api.github.com/repos/${tracked.repo}`
        );
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        const commits = await fetchJson<unknown[]>(
          `https://api.github.com/repos/${tracked.repo}/commits?since=${encodeURIComponent(
            start.toISOString()
          )}&per_page=100`
        );
        return { tracked, repo, commitCount: commits.length };
      })
    );

    const signals: MarketSignal[] = settled.flatMap((item) => {
      if (item.status !== "fulfilled") return [];
      const { tracked, repo, commitCount } = item.value;
      return [
        {
          id: `github-${tracked.repo.replace("/", "-")}`,
          category: tracked.category,
          kind: "count",
          provider: "GitHub",
          title: tracked.label,
          metric: "UTC-day commits",
          currentValue: commitCount,
          unit: "commits",
          observedAt: now.toISOString(),
          sourceUrl: `${repo.html_url}/commits`,
          resolutionSource: `GitHub commit history for ${repo.full_name}`,
          live: true,
          trustScore: 94,
          tags: [
            "github",
            "development",
            tracked.category.toLowerCase(),
            ...tracked.repo.split("/"),
          ],
          detail: `${commitCount} commit${commitCount === 1 ? "" : "s"} since 00:00 UTC · last push ${new Date(
            repo.pushed_at
          ).toLocaleString("en-US", { timeZone: "UTC" })} UTC`,
        },
      ];
    });

    return {
      provider: "GitHub",
      status: signals.length ? "live" : "unavailable",
      signals,
      error: signals.length ? undefined : "Tracked repositories unavailable",
      updatedAt: now.toISOString(),
    };
  },
};
