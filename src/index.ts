#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KrillClient } from "./krill-client.js";

const KRILL_API_KEY = process.env.KRILL_API_KEY;
const KRILL_BASE_URL = process.env.KRILL_BASE_URL || "https://krill.to";

if (!KRILL_API_KEY) {
  console.error(
    "Missing KRILL_API_KEY environment variable. Generate one at https://krill.to/x → Settings → API Key."
  );
  process.exit(1);
}

const client = new KrillClient({
  apiKey: KRILL_API_KEY,
  baseUrl: KRILL_BASE_URL,
});

const server = new McpServer({
  name: "krill",
  version: "0.1.0",
});

// ── Tools ──────────────────────────────────────────────────────

server.tool(
  "search_bookmarks",
  "Search your saved Twitter/X bookmarks by keyword, topic, or author. Uses full-text and semantic search.",
  {
    query: z.string().optional().describe("Search query (keywords, author name, topic)"),
    category: z
      .enum([
        "tech", "ai", "business", "design",
        "productivity", "philosophy", "finance", "health", "other",
      ])
      .optional()
      .describe("Filter by category"),
    limit: z.number().min(1).max(100).optional().describe("Max results (default 20)"),
    offset: z.number().min(0).optional().describe("Pagination offset"),
  },
  async ({ query, category, limit, offset }) => {
    const { bookmarks, total } = await client.searchBookmarks({
      q: query,
      category,
      limit: limit ?? 20,
      offset,
    });

    if (bookmarks.length === 0) {
      return {
        content: [{ type: "text", text: `No bookmarks found${query ? ` for "${query}"` : ""}. Total saved: ${total}` }],
      };
    }

    const formatted = bookmarks
      .map((b) => {
        const parts = [
          `**@${b.tweet.author.handle}**: ${b.tweet.text.slice(0, 280)}`,
          `URL: ${b.tweet.url}`,
          `Category: ${b.category} | Tags: ${b.tags.join(", ") || "none"}`,
          `Saved: ${b.savedAt}`,
        ];
        if (b.notes) parts.push(`Notes: ${b.notes}`);
        if (b.thread?.length) parts.push(`Thread: ${b.thread.length} tweets`);
        return parts.join("\n");
      })
      .join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${total} bookmark${total === 1 ? "" : "s"}${query ? ` matching "${query}"` : ""}:\n\n${formatted}`,
        },
      ],
    };
  }
);

server.tool(
  "ask_bookmarks",
  "Ask a question about your bookmarks. Uses AI to find relevant saved tweets and answer based on them.",
  {
    question: z.string().describe("Your question about your saved bookmarks"),
  },
  async ({ question }) => {
    const { response, bookmarkIds } = await client.chat(question);
    return {
      content: [
        {
          type: "text",
          text: `${response}${bookmarkIds.length ? `\n\n(Based on ${bookmarkIds.length} bookmark${bookmarkIds.length === 1 ? "" : "s"})` : ""}`,
        },
      ],
    };
  }
);

server.tool(
  "list_collections",
  "List all your bookmark collections (like playlists for tweets).",
  {},
  async () => {
    const { collections } = await client.getCollections();
    if (collections.length === 0) {
      return { content: [{ type: "text", text: "No collections yet." }] };
    }
    const formatted = collections
      .map(
        (c) =>
          `${c.icon || "📁"} **${c.name}**${c.description ? ` — ${c.description}` : ""} (${c.bookmarkCount ?? "?"} bookmarks)`
      )
      .join("\n");
    return { content: [{ type: "text", text: formatted }] };
  }
);

server.tool(
  "get_collection_bookmarks",
  "Get all bookmarks in a specific collection.",
  {
    collection_id: z.string().describe("The collection ID"),
  },
  async ({ collection_id }) => {
    const { bookmarks } = await client.getCollectionBookmarks(collection_id);
    if (bookmarks.length === 0) {
      return { content: [{ type: "text", text: "This collection is empty." }] };
    }
    const formatted = bookmarks
      .map((b) => `• @${b.tweet.author.handle}: ${b.tweet.text.slice(0, 200)} — ${b.tweet.url}`)
      .join("\n");
    return { content: [{ type: "text", text: formatted }] };
  }
);

server.tool(
  "create_collection",
  "Create a new bookmark collection.",
  {
    name: z.string().describe("Collection name"),
    description: z.string().optional().describe("Collection description"),
  },
  async ({ name, description }) => {
    const { collection } = await client.createCollection(name, description);
    return {
      content: [
        { type: "text", text: `Created collection "${collection.name}" (ID: ${collection.id})` },
      ],
    };
  }
);

server.tool(
  "add_to_collection",
  "Add a bookmark to a collection.",
  {
    collection_id: z.string().describe("The collection ID"),
    bookmark_id: z.string().describe("The bookmark/tweet ID to add"),
  },
  async ({ collection_id, bookmark_id }) => {
    await client.addBookmarkToCollection(collection_id, bookmark_id);
    return { content: [{ type: "text", text: "Bookmark added to collection." }] };
  }
);

server.tool(
  "update_bookmark",
  "Update a bookmark's category or tags.",
  {
    bookmark_id: z.string().describe("The bookmark/tweet ID"),
    category: z
      .enum([
        "tech", "ai", "business", "design",
        "productivity", "philosophy", "finance", "health", "other",
      ])
      .optional()
      .describe("New category"),
    tags: z.array(z.string()).optional().describe("New tags"),
  },
  async ({ bookmark_id, category, tags }) => {
    const { bookmark } = await client.updateBookmark(bookmark_id, {
      category,
      tags,
    });
    return {
      content: [
        {
          type: "text",
          text: `Updated bookmark. Category: ${bookmark.category}, Tags: ${bookmark.tags.join(", ")}`,
        },
      ],
    };
  }
);

server.tool(
  "add_notes",
  "Add or update personal notes on a bookmark.",
  {
    bookmark_id: z.string().describe("The bookmark/tweet ID"),
    notes: z.string().describe("Your notes about this bookmark"),
  },
  async ({ bookmark_id, notes }) => {
    await client.updateNotes(bookmark_id, notes);
    return { content: [{ type: "text", text: "Notes saved." }] };
  }
);

server.tool(
  "get_highlights",
  "Get all your highlighted passages from bookmarks.",
  {},
  async () => {
    const { highlights } = await client.getHighlights();
    if (highlights.length === 0) {
      return { content: [{ type: "text", text: "No highlights yet." }] };
    }
    const formatted = highlights
      .map(
        (h) =>
          `> "${h.text}"\n— @${h.source.authorHandle} (${h.source.tweetUrl})`
      )
      .join("\n\n");
    return { content: [{ type: "text", text: formatted }] };
  }
);

server.tool(
  "delete_bookmark",
  "Delete a bookmark permanently.",
  {
    bookmark_id: z.string().describe("The bookmark/tweet ID to delete"),
  },
  async ({ bookmark_id }) => {
    await client.deleteBookmark(bookmark_id);
    return { content: [{ type: "text", text: "Bookmark deleted." }] };
  }
);

// ── Start ──────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
