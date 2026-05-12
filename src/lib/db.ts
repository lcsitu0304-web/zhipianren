import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { messages } from "@/lib/schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

export async function saveConversation(roleId: string, messagesData: { role: string; content: string }[]) {
  console.log("Saving conversation:", roleId, messagesData);
  
  for (const msg of messagesData) {
    console.log("Inserting:", { roleId, role: msg.role, content: msg.content });
    await db.insert(messages).values({
      roleId,
      role: msg.role,
      content: msg.content,
    });
  }
  
  console.log("Saved successfully");
}