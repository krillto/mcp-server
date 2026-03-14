/**
 * HTTP client for the krill.to API.
 * Shared between MCP server and OpenClaw plugin.
 */

export interface KrillConfig {
  apiKey: string;
  baseUrl: string;
}

export interface Bookmark {
  id: string;
  tweet: {
    id: string;
    text: string;
    author: { handle: string; name: string; avatarUrl?: string };
    date: string;
    url: string;
    media: Array<{ type: string; url: string }>;
  };
  thread?: Array<{ text: string; position: number }>;
  quotedTweet?: {
    text: string;
    authorHandle: string;
    authorName: string;
    url: string;
  };
  category: string;
  tags: string[];
  notes?: string;
  savedAt: string;
  markdown: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isPublic: boolean;
  createdAt: string;
  bookmarkCount?: number;
}

export class KrillClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: KrillConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/x${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Krill API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async searchBookmarks(params: {
    q?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ bookmarks: Bookmark[]; total: number }> {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return this.request(`/bookmarks${query ? `?${query}` : ""}`);
  }

  async getCollections(): Promise<{ collections: Collection[] }> {
    return this.request("/collections");
  }

  async getCollectionBookmarks(
    collectionId: string
  ): Promise<{ bookmarks: Bookmark[] }> {
    return this.request(`/collections/${collectionId}/bookmarks`);
  }

  async createCollection(
    name: string,
    description?: string
  ): Promise<{ collection: Collection }> {
    return this.request("/collections", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  }

  async addBookmarkToCollection(
    collectionId: string,
    bookmarkId: string
  ): Promise<void> {
    await this.request(`/collections/${collectionId}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ bookmarkId }),
    });
  }

  async updateBookmark(
    id: string,
    update: { category?: string; tags?: string[] }
  ): Promise<{ bookmark: Bookmark }> {
    return this.request(`/bookmarks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    });
  }

  async updateNotes(
    id: string,
    notes: string
  ): Promise<{ bookmark: Bookmark }> {
    return this.request(`/bookmarks/${id}/notes`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.request(`/bookmarks/${id}`, { method: "DELETE" });
  }

  async getCategories(): Promise<{
    categories: Array<{ id: string; name: string; icon?: string }>;
  }> {
    return this.request("/categories");
  }

  async getHighlights(): Promise<{
    highlights: Array<{
      id: string;
      text: string;
      bookmarkId: string;
      source: {
        authorName: string;
        authorHandle: string;
        tweetUrl: string;
      };
    }>;
  }> {
    return this.request("/highlights");
  }

  /** Non-streaming chat — collects the full SSE response into a single string. */
  async chat(
    message: string
  ): Promise<{ response: string; bookmarkIds: string[] }> {
    const url = `${this.baseUrl}/api/x/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Krill chat error ${res.status}: ${await res.text()}`);
    }

    let response = "";
    let bookmarkIds: string[] = [];
    const text = await res.text();

    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "text") response += parsed.content;
        if (parsed.type === "meta" && parsed.bookmarkIds)
          bookmarkIds = parsed.bookmarkIds;
      } catch {
        // skip
      }
    }

    return { response, bookmarkIds };
  }
}
