/**
 * Two evaluation datasets:
 * 1. Code search — TypeScript/JS code snippets with natural language queries
 * 2. Fantasy books — passages from fictional fantasy lore with thematic queries
 *
 * Each dataset has documents + queries with ground-truth relevant doc IDs.
 */

export interface Document {
  id: string;
  text: string;
  metadata: Record<string, string>;
}

export interface Query {
  id: string;
  text: string;
  relevantDocIds: string[]; // ground truth
}

export interface Dataset {
  name: string;
  documents: Document[];
  queries: Query[];
}

export function getCodeDataset(): Dataset {
  const documents: Document[] = [
    {
      id: "code-1",
      text: `export async function fetchUserById(userId: string): Promise<User | null> {
  const response = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  return response.rows[0] ?? null;
}`,
      metadata: { lang: "typescript", topic: "database-query" },
    },
    {
      id: "code-2",
      text: `function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}`,
      metadata: { lang: "typescript", topic: "utility" },
    },
    {
      id: "code-3",
      text: `class BinarySearchTree<T> {
  value: T;
  left: BinarySearchTree<T> | null = null;
  right: BinarySearchTree<T> | null = null;
  
  insert(val: T): void {
    if (val < this.value) {
      this.left ? this.left.insert(val) : (this.left = new BinarySearchTree(val));
    } else {
      this.right ? this.right.insert(val) : (this.right = new BinarySearchTree(val));
    }
  }
}`,
      metadata: { lang: "typescript", topic: "data-structure" },
    },
    {
      id: "code-4",
      text: `const rateLimiter = new Map<string, number[]>();

export function checkRateLimit(ip: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(ip)?.filter(t => now - t < windowMs) ?? [];
  timestamps.push(now);
  rateLimiter.set(ip, timestamps);
  return timestamps.length <= maxRequests;
}`,
      metadata: { lang: "typescript", topic: "rate-limiting" },
    },
    {
      id: "code-5",
      text: `export function parseJWT(token: string): { header: any; payload: any } {
  const [headerB64, payloadB64] = token.split('.');
  return {
    header: JSON.parse(atob(headerB64)),
    payload: JSON.parse(atob(payloadB64)),
  };
}`,
      metadata: { lang: "typescript", topic: "authentication" },
    },
    {
      id: "code-6",
      text: `async function* streamLines(filePath: string): AsyncGenerator<string> {
  const file = Bun.file(filePath);
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\\n');
    buffer = lines.pop()!;
    for (const line of lines) yield line;
  }
  if (buffer) yield buffer;
}`,
      metadata: { lang: "typescript", topic: "file-io" },
    },
    {
      id: "code-7",
      text: `type EventMap = Record<string, (...args: any[]) => void>;

class TypedEventEmitter<T extends EventMap> {
  private listeners = new Map<keyof T, Set<Function>>();
  
  on<K extends keyof T>(event: K, fn: T[K]): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }
  
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.listeners.get(event)?.forEach(fn => fn(...args));
  }
}`,
      metadata: { lang: "typescript", topic: "event-system" },
    },
    {
      id: "code-8",
      text: `export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key)!;
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}`,
      metadata: { lang: "typescript", topic: "caching" },
    },
    {
      id: "code-9",
      text: `interface RetryOptions { maxRetries: number; backoffMs: number; }

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  let lastError: Error;
  for (let i = 0; i <= opts.maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      lastError = e as Error;
      if (i < opts.maxRetries) await Bun.sleep(opts.backoffMs * Math.pow(2, i));
    }
  }
  throw lastError!;
}`,
      metadata: { lang: "typescript", topic: "error-handling" },
    },
    {
      id: "code-10",
      text: `export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private maxSize: number) {}
  
  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }
  
  set(key: K, value: V): void {
    this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.maxSize) {
      this.cache.delete(this.cache.keys().next().value!);
    }
  }
}`,
      metadata: { lang: "typescript", topic: "caching" },
    },
    {
      id: "code-11",
      text: `export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, { algorithm: 'argon2id', memoryCost: 65536, timeCost: 3 });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}`,
      metadata: { lang: "typescript", topic: "authentication" },
    },
    {
      id: "code-12",
      text: `type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void>;

class Router {
  private middlewares: Middleware[] = [];
  
  use(mw: Middleware) { this.middlewares.push(mw); }
  
  async handle(ctx: Context): Promise<void> {
    let idx = 0;
    const next = async () => {
      if (idx < this.middlewares.length) await this.middlewares[idx++](ctx, next);
    };
    await next();
  }
}`,
      metadata: { lang: "typescript", topic: "web-framework" },
    },
    {
      id: "code-13",
      text: `export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function uniqueBy<T, K>(arr: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}`,
      metadata: { lang: "typescript", topic: "utility" },
    },
    {
      id: "code-14",
      text: `export class ConnectionPool {
  private pool: Connection[] = [];
  private waiting: ((conn: Connection) => void)[] = [];
  
  constructor(private maxSize: number, private factory: () => Promise<Connection>) {}
  
  async acquire(): Promise<Connection> {
    if (this.pool.length > 0) return this.pool.pop()!;
    if (this.maxSize > 0) { this.maxSize--; return this.factory(); }
    return new Promise(resolve => this.waiting.push(resolve));
  }
  
  release(conn: Connection): void {
    const waiter = this.waiting.shift();
    waiter ? waiter(conn) : this.pool.push(conn);
  }
}`,
      metadata: { lang: "typescript", topic: "database-query" },
    },
    {
      id: "code-15",
      text: `export function createWebSocketServer(port: number) {
  return Bun.serve({
    port,
    fetch(req, server) {
      if (server.upgrade(req)) return;
      return new Response('Upgrade required', { status: 426 });
    },
    websocket: {
      open(ws) { ws.subscribe('chat'); },
      message(ws, msg) { ws.publish('chat', msg); },
      close(ws) { ws.unsubscribe('chat'); },
    },
  });
}`,
      metadata: { lang: "typescript", topic: "websocket" },
    },
    {
      id: "code-16",
      text: `export async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}`,
      metadata: { lang: "typescript", topic: "concurrency" },
    },
    {
      id: "code-17",
      text: `export function dijkstra(graph: Map<string, [string, number][]>, start: string): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]]);
  const pq: [number, string][] = [[0, start]];
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const [v, w] of graph.get(u) ?? []) {
      const nd = d + w;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        pq.push([nd, v]);
      }
    }
  }
  return dist;
}`,
      metadata: { lang: "typescript", topic: "algorithm" },
    },
    {
      id: "code-18",
      text: `export class Observable<T> {
  private subscribers = new Set<(value: T) => void>();
  
  subscribe(fn: (value: T) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
  
  next(value: T): void {
    this.subscribers.forEach(fn => fn(value));
  }
  
  pipe<R>(transform: (obs: Observable<T>) => Observable<R>): Observable<R> {
    return transform(this);
  }
}`,
      metadata: { lang: "typescript", topic: "reactive" },
    },
    {
      id: "code-19",
      text: `export function validateEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/.test(email);
}

export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}`,
      metadata: { lang: "typescript", topic: "validation" },
    },
    {
      id: "code-20",
      text: `export class TaskQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = 0;
  
  constructor(private concurrency: number) {}
  
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await task()); }
        catch (e) { reject(e); }
        finally { this.running--; this.drain(); }
      });
      this.drain();
    });
  }
  
  private drain() {
    while (this.running < this.concurrency && this.queue.length) {
      this.running++;
      this.queue.shift()!();
    }
  }
}`,
      metadata: { lang: "typescript", topic: "concurrency" },
    },
  ];

  const queries: Query[] = [
    {
      id: "cq-1",
      text: "How to query a user from the database by their ID",
      relevantDocIds: ["code-1", "code-14"],
    },
    {
      id: "cq-2",
      text: "Implement a debounce function to limit rapid calls",
      relevantDocIds: ["code-2"],
    },
    {
      id: "cq-3",
      text: "Binary tree data structure with insert operation",
      relevantDocIds: ["code-3"],
    },
    {
      id: "cq-4",
      text: "Rate limiting middleware for API requests by IP address",
      relevantDocIds: ["code-4"],
    },
    {
      id: "cq-5",
      text: "Parse and decode a JWT token",
      relevantDocIds: ["code-5"],
    },
    {
      id: "cq-6",
      text: "Stream and read a file line by line asynchronously",
      relevantDocIds: ["code-6"],
    },
    {
      id: "cq-7",
      text: "Type-safe event emitter with typed events",
      relevantDocIds: ["code-7"],
    },
    {
      id: "cq-8",
      text: "Cache function results with memoization",
      relevantDocIds: ["code-8", "code-10"],
    },
    {
      id: "cq-9",
      text: "Retry a failed async operation with exponential backoff",
      relevantDocIds: ["code-9"],
    },
    {
      id: "cq-10",
      text: "LRU cache implementation with size limit",
      relevantDocIds: ["code-10"],
    },
    {
      id: "cq-11",
      text: "Hash and verify passwords securely with argon2",
      relevantDocIds: ["code-11"],
    },
    {
      id: "cq-12",
      text: "Middleware chain pattern for HTTP request handling",
      relevantDocIds: ["code-12"],
    },
    {
      id: "cq-13",
      text: "Split an array into chunks of a given size",
      relevantDocIds: ["code-13"],
    },
    {
      id: "cq-14",
      text: "Database connection pooling with acquire and release",
      relevantDocIds: ["code-14"],
    },
    {
      id: "cq-15",
      text: "WebSocket server with pub/sub chat rooms",
      relevantDocIds: ["code-15"],
    },
    {
      id: "cq-16",
      text: "Run async tasks in parallel with concurrency limit",
      relevantDocIds: ["code-16", "code-20"],
    },
    {
      id: "cq-17",
      text: "Shortest path algorithm in a weighted graph",
      relevantDocIds: ["code-17"],
    },
    {
      id: "cq-18",
      text: "Observable reactive pattern with subscribe and pipe",
      relevantDocIds: ["code-18"],
    },
    {
      id: "cq-19",
      text: "Validate email format and sanitize HTML input",
      relevantDocIds: ["code-19"],
    },
    {
      id: "cq-20",
      text: "Task queue that processes jobs with limited concurrency",
      relevantDocIds: ["code-20", "code-16"],
    },
  ];

  return { name: "Code Search", documents, queries };
}

export function getFantasyDataset(): Dataset {
  const documents: Document[] = [
    {
      id: "fan-1",
      text: "The Obsidian Throne sits at the heart of Valdris, forged from the bones of the first dragon Kaeltharion. Only those of the Sunblood lineage may claim it, for the throne burns all others with black flame. King Aldren the Wise was the last to sit upon it before the Shattering.",
      metadata: { topic: "artifact", region: "Valdris" },
    },
    {
      id: "fan-2",
      text: "The Whispering Woods of Elyndra are home to the Sylvari, an ancient race of tree-bound spirits. They communicate through root networks spanning hundreds of miles, sharing memories and warnings. No army has ever successfully marched through the Whispering Woods, for the trees themselves fight back.",
      metadata: { topic: "location", region: "Elyndra" },
    },
    {
      id: "fan-3",
      text: "Archmage Seraphina discovered the Seventh School of magic — Chronomancy — by studying the crystallized tears of dying stars. Unlike the six classical schools, Chronomancy allows manipulation of temporal threads, though each use ages the caster by years. She documented her findings in the Codex Temporalis before vanishing from all timelines.",
      metadata: { topic: "magic", region: "Astoria" },
    },
    {
      id: "fan-4",
      text: "The Ironveil Dwarves of Mount Kraggen are master runesmiths who bind elemental spirits into weapons and armor. Their greatest creation, the Aegis of Storms, can summon lightning at the wielder's command. The forging process requires singing in the Old Tongue for seven days without rest.",
      metadata: { topic: "crafting", region: "Kraggen" },
    },
    {
      id: "fan-5",
      text: "The Blood Pact of Morvaine was a dark ritual performed by the Nightborn Coven, binding thirteen witches to a single immortal consciousness. They share thoughts, pain, and power across any distance. Destroying one member weakens the whole, but killing all thirteen simultaneously is the only way to end the Pact.",
      metadata: { topic: "magic", region: "Morvaine" },
    },
    {
      id: "fan-6",
      text: "The Floating Isles of Zephyria drift above the Cloudmere Sea, held aloft by ancient levitation crystals embedded in their foundations. Each isle is a sovereign city-state, connected by sky-bridges and airship routes. The largest isle, Celestia Prime, houses the Grand Observatory where seers chart the movements of the Wandering Stars.",
      metadata: { topic: "location", region: "Zephyria" },
    },
    {
      id: "fan-7",
      text: "Dragonbond is the sacred ritual by which a rider's soul merges with their dragon's. The bond grants telepathic communication, shared senses, and mutual healing. If one dies, the other enters the Grief Madness — a berserker state that ends only in death or the rare intervention of a Soulweaver.",
      metadata: { topic: "magic", region: "Valdris" },
    },
    {
      id: "fan-8",
      text: "The Tidecallers of the Sapphire Coast can command the ocean itself. Their power derives from the Moon Pearls they swallow during their initiation rite. A master Tidecaller can raise tsunamis, calm storms, or part the sea to reveal the sunken ruins of Old Thalassia beneath the waves.",
      metadata: { topic: "magic", region: "Sapphire Coast" },
    },
    {
      id: "fan-9",
      text: "The Shadowfell Assassins Guild operates from the city of Nethermere, hidden in a pocket dimension accessible only through mirrors at midnight. Their signature technique, the Phantom Step, allows them to move between shadows instantaneously. The Guild's leader, known only as the Hollow King, has never been seen by any living person.",
      metadata: { topic: "faction", region: "Nethermere" },
    },
    {
      id: "fan-10",
      text: "The World Tree Yggdrasil stands at the center of the Verdant Expanse, its roots reaching into all seven realms. Its sap, called Ambrosia, can heal any wound and extend life by centuries. The Druids of the Green Circle are its sworn protectors, and they wage eternal war against the Blight — a corruption that slowly petrifies the Tree's bark.",
      metadata: { topic: "location", region: "Verdant Expanse" },
    },
    {
      id: "fan-11",
      text: "The Stormforged are warriors struck by divine lightning during the Tempest Trials. The lightning rewrites their bodies, granting superhuman strength, speed, and the ability to channel electricity through their weapons. Only one in a hundred survives the Trial; the rest are reduced to ash.",
      metadata: { topic: "faction", region: "Thunderpeak" },
    },
    {
      id: "fan-12",
      text: "The Codex of Infinite Pages is a sentient spellbook that writes itself, adding new spells as magic evolves across the world. It currently resides in the Forbidden Library of Archon, chained to a reading pedestal by unbreakable wards. Scholars who read too deeply go mad, their minds unable to contain the infinite knowledge within.",
      metadata: { topic: "artifact", region: "Archon" },
    },
    {
      id: "fan-13",
      text: "The Sandwraiths of the Ashara Desert are spirits of ancient warriors cursed to wander the dunes for eternity. They appear during sandstorms, their translucent forms wielding weapons of compressed sand. The only protection against them is Ghostglass — a rare mineral found in oases that repels undead energy.",
      metadata: { topic: "creature", region: "Ashara" },
    },
    {
      id: "fan-14",
      text: "The Merchant Princes of Goldport control the world's economy through the Bank of Eternal Ledgers, where every transaction across all realms is magically recorded. Their currency, Soulmarks, are coins imprinted with a fraction of the owner's life force, making counterfeiting impossible and theft literally painful.",
      metadata: { topic: "faction", region: "Goldport" },
    },
    {
      id: "fan-15",
      text: "The Voidborn are entities from beyond the stars, formless beings of pure entropy that seek to unmake reality. They can only enter the world through Void Rifts — tears in the fabric of space created by catastrophic magical events. The Order of the Silver Seal was founded specifically to detect and close these rifts before the Voidborn can fully manifest.",
      metadata: { topic: "creature", region: "Cosmic" },
    },
    {
      id: "fan-16",
      text: "Soulweaving is the rarest magical discipline, practiced by fewer than a dozen living mages. A Soulweaver can see, touch, and manipulate the threads of a person's soul — healing spiritual wounds, breaking curses, or even transferring consciousness between bodies. The practice is considered sacred by some religions and heretical by others.",
      metadata: { topic: "magic", region: "Various" },
    },
    {
      id: "fan-17",
      text: "The Siege of Ironhold lasted three hundred days, as the combined armies of the Southern Alliance battered against the dwarven fortress. It ended not through military victory but when the dwarves opened the Magma Gates, flooding the valley with molten rock and destroying both the besieging army and their own lower halls.",
      metadata: { topic: "history", region: "Kraggen" },
    },
    {
      id: "fan-18",
      text: "The Fae Courts are divided into the Seelie (Summer) and Unseelie (Winter) factions, each ruled by an immortal monarch. The Seelie Queen Titania governs growth, beauty, and passion, while the Unseelie King Mab commands decay, cunning, and endurance. Every century, they exchange thrones in the Rite of Turning.",
      metadata: { topic: "faction", region: "Feywild" },
    },
    {
      id: "fan-19",
      text: "The Astral Navigators use enchanted astrolabes to sail the spaces between planes of existence. Their ships, called Voidskimmers, are grown from living crystal and powered by captured starlight. The most dangerous route, the Serpent's Passage, winds through a region of collapsed realities where the laws of physics change without warning.",
      metadata: { topic: "faction", region: "Astral" },
    },
    {
      id: "fan-20",
      text: "The Prophecy of the Shattered Crown foretells that when the last Sunblood heir reunites the five fragments of the Crown of Ages, the Obsidian Throne will awaken and the dragons will return from their exile beyond the Veil. Three fragments have been found; the remaining two are believed to be hidden in the Shadowfell and the Abyssal Depths.",
      metadata: { topic: "prophecy", region: "Valdris" },
    },
  ];

  const queries: Query[] = [
    {
      id: "fq-1",
      text: "What is the Obsidian Throne and who can sit on it?",
      relevantDocIds: ["fan-1", "fan-20"],
    },
    {
      id: "fq-2",
      text: "Tell me about the forest spirits that communicate through roots",
      relevantDocIds: ["fan-2"],
    },
    {
      id: "fq-3",
      text: "Time manipulation magic and its costs",
      relevantDocIds: ["fan-3"],
    },
    {
      id: "fq-4",
      text: "Dwarven weapon crafting with elemental runes",
      relevantDocIds: ["fan-4", "fan-17"],
    },
    {
      id: "fq-5",
      text: "Dark ritual that binds multiple witches into one mind",
      relevantDocIds: ["fan-5"],
    },
    {
      id: "fq-6",
      text: "Cities that float in the sky above the clouds",
      relevantDocIds: ["fan-6"],
    },
    {
      id: "fq-7",
      text: "How does a dragon rider bond with their dragon?",
      relevantDocIds: ["fan-7"],
    },
    {
      id: "fq-8",
      text: "Ocean magic and controlling the tides",
      relevantDocIds: ["fan-8"],
    },
    {
      id: "fq-9",
      text: "Assassin guild that uses shadow teleportation",
      relevantDocIds: ["fan-9"],
    },
    {
      id: "fq-10",
      text: "The great world tree and its healing sap",
      relevantDocIds: ["fan-10"],
    },
    {
      id: "fq-11",
      text: "Warriors empowered by divine lightning",
      relevantDocIds: ["fan-11"],
    },
    {
      id: "fq-12",
      text: "A magical book that writes itself with new spells",
      relevantDocIds: ["fan-12"],
    },
    {
      id: "fq-13",
      text: "Undead spirits haunting the desert during sandstorms",
      relevantDocIds: ["fan-13"],
    },
    {
      id: "fq-14",
      text: "Economy and currency system backed by life force",
      relevantDocIds: ["fan-14"],
    },
    {
      id: "fq-15",
      text: "Cosmic entities of entropy that threaten reality",
      relevantDocIds: ["fan-15"],
    },
    {
      id: "fq-16",
      text: "Manipulating and healing someone's soul",
      relevantDocIds: ["fan-16", "fan-7"],
    },
    {
      id: "fq-17",
      text: "Famous siege that ended with volcanic destruction",
      relevantDocIds: ["fan-17"],
    },
    {
      id: "fq-18",
      text: "Summer and Winter fairy courts and their rulers",
      relevantDocIds: ["fan-18"],
    },
    {
      id: "fq-19",
      text: "Sailing between dimensions on crystal ships",
      relevantDocIds: ["fan-19"],
    },
    {
      id: "fq-20",
      text: "Prophecy about reuniting crown fragments and dragon return",
      relevantDocIds: ["fan-20", "fan-1"],
    },
  ];

  return { name: "Fantasy Books", documents, queries };
}
