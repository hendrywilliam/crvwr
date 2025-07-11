import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

export const anthropic = new Anthropic({
    apiKey: process.env["ANTHROPIC_API_KEY"],
});
