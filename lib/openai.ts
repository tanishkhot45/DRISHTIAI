import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "[drishti] OPENAI_API_KEY is not set. LLM-backed endpoints will fail."
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export const MODELS = {
  reasoning: process.env.OPENAI_MODEL || "gpt-4o",
  chat: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
  embed: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
};

export const CONFIG = {
  shortlistSize: Number(process.env.SHORTLIST_SIZE || 15),
  ragTopK: Number(process.env.RAG_TOP_K || 6),
};
