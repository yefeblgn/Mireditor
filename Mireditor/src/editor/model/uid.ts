// Hafif, bağımlılıksız benzersiz id üretici.
// nanoid yerine kullanılır — kriptografik değil, UI/katman id'leri için yeterli.
let counter = 0;

export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000;
  const rnd = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${prefix}_${time}${rnd}${counter.toString(36)}`;
}
