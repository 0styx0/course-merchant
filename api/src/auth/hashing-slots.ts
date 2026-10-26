/**
 * Caps how many password hashes one server runs at once. Each Argon2 hash
 * holds 19 MiB and a thread, and the per-email limit doesn't cap total work
 * (rotating emails would pile hashes up), so extra logins are refused at
 * once instead of queuing. This only limits this server's own load, so it is
 * the one piece of auth state kept in memory.
 */
export class HashingSlots {
  private inUse = 0;

  constructor(private readonly capacity: number) {}

  /** A function that frees the slot, or null when every slot is taken. */
  tryAcquire(): (() => void) | null {
    if (this.inUse >= this.capacity) {
      return null;
    }

    this.inUse += 1;
    let released = false;

    return () => {
      if (!released) {
        released = true;
        this.inUse -= 1;
      }
    };
  }
}
