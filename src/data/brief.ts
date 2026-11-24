/**
 * The services of the brief form ("Projeni anlat"). The labels are also what the
 * server accepts (api/idea.js keeps the same list), so change both together.
 */
export type Service = {
  label: string;
  /** The short guiding question shown above the brief when this service is chosen. */
  hint: string;
};

export const SERVICES: readonly Service[] = [
  { label: "Motion Design", hint: "Hangi mesajı hareketle anlatmak istiyorsun?" },
  { label: "Video Kurgu", hint: "Elindeki görüntüler nasıl bir videoya dönüşsün?" },
  { label: "AI Artist", hint: "Hangi görsel dünyayı veya sahneyi keşfetmek istiyorsun?" },
  { label: "Art Direction", hint: "Markanın ya da kampanyanın nasıl hissettirmesini istiyorsun?" },
  { label: "Grafik Tasarım", hint: "Neyi tasarlıyoruz ve nerede kullanılacak?" },
  { label: "Birlikte belirleyelim", hint: "Neyi, kimin için ve nerede kullanacağını kısaca anlat; gerisini birlikte belirleriz." },
];

/** "Not decided yet": it stands alone, so choosing it clears the others and the other way round. */
export const OPEN_SERVICE = "Birlikte belirleyelim";
