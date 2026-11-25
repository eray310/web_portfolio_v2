# /ai-isler ve /hakkimda: imleçle bükülen uzay ve canlı anlatımlar. Tasarım yönü

Başlangıç noktası (geri dönüş): `main` = `875a4e5`, etiket `pre-ai-space-redesign`, canlı paket `main-CueA4Yyq.js`.
Dal: `design/ai-hakkimda-space`. Önizleme onaylanmadan `main`'e birleştirilmez, yayına alınmaz.

## Mevcut sayfanın denetimi (1440×900 ve 390 px, tarayıcıda)

- Sayfa 4016 px (masaüstü) ve 5834 px (mobil). Bölümler 647 / 1043 / 656 px.
- Her bölümde dört küçük etiket (numaralı üst başlık, "PROJE ÖRNEĞİ", "KAPSAM", rozet): toplam 10. Numara bir sıra
  anlatmıyor (bu üç iş sıralı bir süreç değil), etiketler başlığın ve görselin söylediğini tekrarlıyor.
- Çıktılar yuvarlak çerçeveli rozetler, "Kapsam ayrıntıları" ayrı bir kutu, üstüne üç ayrı çerçeve: çerçeve gürültüsü.
- 5 adet "Projeni anlat": açılış, üç bölüm, kapanış. Aynı eylem beş kez, aynı ağırlıkta.
- Görseller durağan: ekran görüntüsü, kapak, üç çizili ekran. Hizmeti göstermiyor, süslüyor.
- Satır uzunluğu iyi (özet metni yaklaşık 50 karakter), tipografi ölçeği 124 → 54 → 20 → 16 px: hiyerarşi var, ama bölüm
  başlığı ile görsel arasındaki boşluk büyük ve görsel küçük.
- Mobil: ilk ekranda başlık + metin + video var (iyi), ama bölümlerde metin, görsel, kapsam, düğme alt alta uzuyor.
- Uygulama prototipi üç telefonu yana kaydırtıyor (yatay sürükleme).

Kullanılabilen beceriler: **frontend-design** (ana değerlendirme), **Human Interface Guidelines** (kullanım ve erişilebilirlik).
**Impeccable** ve **Emil Kowalski** rehberleri bu oturumda kurulu değil, açılamadı. Hareket kararlarını HIG (Media, motion
and haptics), WCAG 2.2.2 ve web.dev'in prefers-reduced-motion yazısına dayandırdım.

## İlkeler (kaynaklara bağlı)

1. **Durdur / gizle (WCAG 2.2.2, Seviye A):** 5 sn'den uzun, kendiliğinden başlayan hareket, durdurulabilir olmalı.
   Uzay ve döngüler için tek yerde "Arka planı durdur" (mevcut) ve her görselde ekran dışında / gizli sekmede durma.
2. **Hareketi azalt = az hareket, sıfır değil (web.dev, MDN):** azaltılmış hareket tercihinde döngüler durur ve
   tamamlanmış kompozisyon gösterilir; içerik kaybolmaz.
3. **Hareket bir şey söylemeli:** süs olarak sürekli hareket yok. Her döngü giriş, gelişme, yerleşme, bekleme ve
   yumuşak dönüşten oluşur. Kullanıcı eylemine yanıt veren hareket (imleç) serbest.
4. **Kısıt:** imleç etkisi hız ve alan ile sınırlı, metin alanında sakin; dekoratif katman tıklamayı yakalamaz.

## Plan (token, tip, yerleşim)

- **Renk:** gece `#05070c`, derin lacivert `#091222`, kırık beyaz `#eae5ec`, turkuaz `#5eead4`, koyu turkuaz `#0d9488`.
  İş örneklerinin kendi renkleri (Voop pembesi, portfolyonun ekran görüntüsü) olduğu gibi kalır.
- **Tip:** Geist (sitenin yazı tipi), tek aile. Başlıklar 700, sıkı iz (`-0.03em`), metin 400 / 1.6. Ölçek: 124 / 64 / 24 / 18 / 16.
  Başlık bölümün imzasıdır; altında tek cümle.
- **Yerleşim:** her hizmet için büyük başlık + tek cümle solda, o hizmeti anlatan döngü sağda ya da altta; kapsam
  ikinci seviyede (açılır), eylem tek. Bölümler dönüşümlü sağ/sol.
- **Etiket politikası:** numara yok, "PROJE ÖRNEĞİ" yok. Yalnızca gerçekten gereken: "Konsept prototip".

```
masaüstü bölüm:                           mobil bölüm:
[ Başlık (büyük)        ] [ döngü    ]    [ Başlık ]
[ tek cümle             ] [ kompoz.  ]    [ tek cümle ]
[ çıktılar (düz liste)  ] [          ]    [ döngü (tam genişlik) ]
[ Projeni anlat  Kapsam ▾ ]               [ Projeni anlat ] [ Kapsam ▾ ]
```

## Plan gözden geçirme (varsayılan çıkmasın diye)

- İlk taslakta üç bölüm de aynı "metin + çerçeveli görsel" kalıbındaydı. Değiştirdim: her hizmetin kendi kompozisyonu var
  (web: tarayıcı kuruluyor ve kaydırılıyor; video: dikey önizleme + zaman çizelgesi; uygulama: seçimin ekranlar arası
  taşındığı akış). Çerçeve tekrarını bıraktım: çerçeve yalnızca web'de (tarayıcı gerçekten çerçeve).
- Rozet / etiket yığınını kaldırdım; çıktıları kutu yerine düz liste yaptım.
- Uzay: parlak imleç halesi yok. Etki imleç çevresinde yıldızı iten, ışık dokusunu büken ve kısa süre iz bırakan bir akış
  alanı; metin tarafında zayıf, boşlukta görünür.

## Uzay mimarisi

- Ortak, düşük çözünürlüklü akış alanı (`flowField.ts`, 40×24 ızgara, CPU): imleç hızıyla orantılı (sınırlı) itme +
  yön boyunca bükülme; hız ve iz ayrı sönümlenir; imleç durunca sakinleşir.
- `/ai-isler`: mevcut Three.js sahnesi. Yıldız köşe gölgelendiricisi alanı okur, arka plan gölgelendiricisi ince ışık
  dokusunu alanla büker (ikinci canvas yok). Kalite düşünce önce doku, sonra yer değiştirme kapanır.
- `/hakkimda`: sahne DOM + CSS. Tek hafif 2B canvas, yalnızca imleç hareket ederken çizer; CSS yıldız katmanları alanla
  hafifçe kayar. Kaydırmaya bağlı kamera ve sahne menüsü olduğu gibi.
- Mobil / dokunmatik: imleç etkisi kapalı, uzayın yavaş hareketi sürer. Hareketi azalt: durağan kare.
