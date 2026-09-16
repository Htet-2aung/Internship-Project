import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const seedDocuments = [
  {
    title: 'React fundamentals',
    content: 'React applications are built from components. Props pass data into components, state stores changing data, and hooks such as useState and useEffect manage interactive behavior.',
  },
  {
    title: 'Retrieval augmented generation',
    content: 'RAG retrieves relevant documents before generation. A typical pipeline chunks documents, creates embeddings, searches a vector store, and gives the best context to an LLM.',
  },
  {
    title: 'PostgreSQL and Prisma',
    content: 'Prisma provides a typed database client for PostgreSQL. Run prisma db push during development to synchronize a schema, and use migrations for controlled production changes.',
  },
];

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if ((await this.prisma.knowledgeDocument.count()) === 0) {
      await this.prisma.knowledgeDocument.createMany({ data: seedDocuments });
    }
  }

  listSessions(userId: number) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async createSession(userId: number, title = 'New conversation') {
    return this.prisma.chatSession.create({
      data: { userId, title },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async updateSession(userId: number, id: number, title: string) {
    await this.getSession(userId, id);
    return this.prisma.chatSession.update({
      where: { id },
      data: { title },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async deleteSession(userId: number, id: number) {
    await this.getSession(userId, id);
    await this.prisma.chatSession.delete({ where: { id } });
    return { success: true };
  }

  async listMessages(userId: number, sessionId: number) {
    await this.getSession(userId, sessionId);
    return this.prisma.chatMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });
  }

  async ask(userId: number, sessionId: number, content: string) {
    await this.getSession(userId, sessionId);
    const userMessage = await this.prisma.chatMessage.create({
      data: { sessionId, role: 'user', content },
    });
    const documents = await this.retrieve(content);
    const answer = await this.generateAnswer(content, documents);
    const assistantMessage = await this.prisma.chatMessage.create({
      data: { sessionId, role: 'assistant', content: answer },
    });
    await this.prisma.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    return { userMessage, assistantMessage, sources: documents.map((document) => document.title) };
  }

  private async getSession(userId: number, id: number) {
    const session = await this.prisma.chatSession.findFirst({ where: { id, userId } });
    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  private async retrieve(query: string) {
    const terms = this.words(query);
    const documents = await this.prisma.knowledgeDocument.findMany();
    return documents
      .map((document) => ({ document, score: [...this.words(`${document.title} ${document.content}`)].filter((word) => terms.has(word)).length }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ document }) => document);
  }

  private async generateAnswer(query: string, documents: { title: string; content: string }[]) {
    const context = documents.map((document) => `${document.title}: ${document.content}`).join('\n');
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'Answer using only the supplied context. Say when the context does not contain the answer.' },
            { role: 'user', content: `Context:\n${context || 'No matching context found.'}\n\nQuestion: ${query}` },
          ],
        }),
      });
      if (response.ok) {
        const data = await response.json() as { choices?: [{ message?: { content?: string } }] };
        const generated = data.choices?.[0]?.message?.content;
        if (generated) return generated;
      }
    }
    if (!documents.length) return 'I could not find anything relevant in the knowledge base yet.';
    return `I found relevant information in ${documents.map((document) => document.title).join(', ')}:\n\n${documents[0].content}`;
  }

  private words(value: string) {
    return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2));
  }
}