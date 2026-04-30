declare module "imapflow" {
  export class ImapFlow {
    constructor(options: Record<string, unknown>);
    connect(): Promise<void>;
    logout(): Promise<void>;
    close(): void;
    mailboxOpen(path: string): Promise<unknown>;
    getMailboxLock(path: string): Promise<{ release(): void }>;
    search(query: unknown): Promise<number[]>;
    fetchOne(
      seq: number | string,
      query: Record<string, unknown>,
      options?: Record<string, unknown>
    ): Promise<Record<string, any>>;
  }
}

declare module "mailparser" {
  export function simpleParser(
    source: string | Buffer
  ): Promise<{
    text?: string | null;
    html?: string | Buffer | false | null;
    subject?: string | null;
    messageId?: string | null;
    date?: Date | null;
    from?: {
      value?: Array<{ name?: string | null; address?: string | null }>;
    } | null;
  }>;
}
