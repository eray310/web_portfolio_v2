# Brief ve KVKK başvurularını Türkiye'de alma planı (taslak)

Durum: **plan + çalışan prototip**. Site henüz bu sunucuyu çağırmıyor; mevcut brief formunun görünümü ve kullanımı aynı kalır. Prototip `server/index.mjs`, testi `node server/test.mjs` (yalnızca sahte veri, 30 kontrol).

## 1. Hedef akış

```
Ziyaretçi ── sayfa isteği ──► Vercel (statik site; form verisi burada işlenmez)
     │
     └── brief / KVKK başvurusu (JSON, HTTPS) ──► form.<alan-adın>  (Türkiye'deki VPS)
                                                    │  Caddy (TLS) → Node servisi → SQLite (alan şifreli)
                                                    └──► "Yeni brief var" (içeriksiz bildirim) ──► telefonun
Sen ── Bearer token ──► /admin/briefs, /admin/applications  (içeriği okursun, silersin)
```

- Brief içeriği Vercel'e, Resend'e ve Gmail'e **hiç gitmez**. Sana yalnızca sabit metin gelir: `Yeni brief var` (ad, e-posta, metin yok).
- Ziyaretçinin tarayıcısı sayfayı yine Vercel'den alır; bu istekte IP adresi Vercel'e ulaşır. Değişen şey form verisinin Vercel'den geçmemesi.

## 2. En basit kurulum (tek sunucu, tek servis)

| Parça | Seçim | Neden |
|---|---|---|
| Sunucu | Türkiye'de 1 küçük Linux VPS (1 vCPU, 1 GB RAM, 20 GB disk yeter) | Veri Türkiye'de kalır |
| Uygulama | `server/index.mjs` (Node 22+, bağımlılık yok) | Tek dosya, kolay denetlenir |
| Depolama | SQLite dosyası (`DATA_DIR`), her kayıt AES-256-GCM ile şifreli | Veritabanı sunucusu kurmak gerekmiyor |
| TLS | Caddy (otomatik Let's Encrypt sertifikası) | Elle sertifika yenilemek yok |
| Bildirim | `NOTIFY_URL` → ntfy (ücretsiz uygulama) ya da kendi sunucunda barındırılan ntfy | İçeriksiz push |
| Süreç | systemd | Çökerse yeniden başlar |

Caddy (`/etc/caddy/Caddyfile`):

```
form.alan-adin.com {
    reverse_proxy 127.0.0.1:8787
}
```

systemd (`/etc/systemd/system/form.service`), değerler dosyada değil `EnvironmentFile`'da:

```
[Service]
User=form
WorkingDirectory=/opt/form
ExecStart=/usr/bin/node server/index.mjs
EnvironmentFile=/etc/form.env     # chmod 600, root'a ait
Restart=always
```

`/etc/form.env` (değerleri sen üretirsin, hiçbir yere yazma/gönderme):

```
ENC_KEY=<openssl rand -hex 32>
ADMIN_TOKEN=<openssl rand -hex 24>
ORIGINS=https://www.erayomeroglu.com
DATA_DIR=/var/lib/form
NOTIFY_URL=https://ntfy.sh/<uzun-rastgele-konu-adı>
TRUST_PROXY=1
```

**Sitede değişecek tek şey** (şimdilik yapılmadı): `BriefFlow.tsx` içindeki `fetch("/api/idea", …)` adresi yapılandırılabilir olur (`VITE_BRIEF_ENDPOINT`, yoksa eski adres). Görünüm, adımlar ve davranış aynı kalır. Geçiş bittiğinde `api/idea.js` kaldırılır ve Gizlilik/KVKK metinlerindeki Vercel, Resend ve Gmail aktarım ifadeleri güncellenir.

Bildirim notu: ntfy.sh dış bir hizmettir (sunucu konumu doğrulanmadı) ama yalnızca "Yeni brief var" metnini ve zamanı görür. İstemezsen ntfy'yi aynı VPS'te kendin çalıştırırsın, ya da servis sağlayıcının SMTP'siyle içeriksiz bir e-posta gönderirsin (bu prototipte yok, `notify()` fonksiyonu değiştirilir).

## 3. Ayrı KVKK Başvuru Formu (planlanan)

Sayfa: `/kvkk-basvuru`, brief formundan ayrı; gönderim `POST /api/kvkk-basvuru` (prototipte hazır).

Tebliğ m.5/2 ile alanlar:

| Tebliğ'in istediği | Formda |
|---|---|
| Ad, soyad | `fullName` |
| T.C. kimlik no (yabancıda uyruk ve pasaport/kimlik no) | `idType`, `idNumber` (T.C. için sağlama basamakları kontrol edilir), `nationality` |
| Tebligat adresi (yerleşim yeri / iş yeri) | `address` |
| E-posta, telefon, faks (varsa) | `email`, `phone` |
| Talebin konusu | `request` |
| İmza (yazılı başvuruda) | Formda yok; form "yazılı" değil yazılım yoluyla başvurudur |

Başvuru bilgilerini güvenli alma (prototipte uygulanan ve testle gösterilenler):

1. **Ayrı uç nokta ve ayrı tablo.** Başvurular `applications` tablosunda, brief'lerden ayrı. Şifreli kayıt tablo adına bağlı (AAD): brief'e ait şifreli veri başvuru tablosunda açılmaz, tersi de.
2. **Alan şifreleme.** Her kayıt AES-256-GCM, kayıt başına rastgele IV. Veritabanı dosyasında ad, T.C. no, adres, metin okunamaz (testte dosyada aranıp bulunmadı).
3. **Taşıma.** Yalnızca HTTPS (Caddy). Sunucu yalnızca belirlenen site kaynağından (`ORIGINS`) POST kabul eder.
4. **Kötüye kullanıma karşı.** Gizli tuzak alanı, doldurma süresi kontrolü, adres başına 10 dakikada 3 başvuru, 24 KB üst sınır, JSON dışı içerik reddi.
5. **Log yok.** İstek gövdesi ve IP yazılmaz; sunucunun tek günlük satırı sabit metin (testle doğrulanıyor).
6. **Başvuru numarası.** `K-XXXXXXXXXX`; başvuran bunu görür. Sen listeden bulursun.
7. **30 gün sayacı.** Her başvuruya `due = alınma + 30 gün` yazılır; `/admin/applications` süreye göre sıralar.
8. **Sana bildirim.** Yalnızca `Yeni KVKK başvurusu var`.
9. **Okuma.** Yalnızca `Authorization: Bearer <ADMIN_TOKEN>`; belirteç sabit sürede karşılaştırılır.

```
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://form.alan-adin.com/admin/applications
curl -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"status":"answered"}' https://form.alan-adin.com/admin/applications/K-XXXXXXXXXX
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" https://form.alan-adin.com/admin/briefs/B-XXXXXXXXXX
```

Sınırlar (açıkça):
- `ENC_KEY` aynı sunucuda durur. Sunucuyu biri ele geçirirse anahtarı da alır. Şifreleme, **veritabanı dosyasının ve yedeklerin sızmasına** karşı korur, sunucunun ele geçirilmesine karşı değil.
- Kimlik doğrulaması: Form T.C. numarasını alır ama kimlik belgesi istemez. Gerçek başvuru sahibi olup olmadığını yanıt aşamasında e-posta/adres üzerinden doğrularsın. Bu süreci bir hukukçuyla netleştir.
- Başvuruların ne kadar saklanacağı ve yanıt sonrası silme süresi hukuki karar; kodda otomatik silme yok.
- Türkiye'de bir VPS'in disk şifrelemesi ve fiziksel güvenliği sağlayıcıya bağlıdır; sağlayıcı sayfalarında ISO 27001 vb. belirtilmeyenler için yazılı sor.

## 4. Veri ve yedek nerede

- **Canlı veri:** VPS diskinde `DATA_DIR/records.sqlite` (Türkiye'deki veri merkezi).
- **Yedek (öneri):** günlük `sqlite3 records.sqlite ".backup yedek.sqlite"`, sonra şifreleyip (ör. `age` veya `openssl enc`) **iki yerde** tut: (a) sağlayıcının aynı veri merkezindeki ayrı disk/snapshot'ı (sağlayıcıya sor), (b) senin bilgisayarına `scp` ile (Türkiye'de). Yurt dışı bulut yedeği kullanma.
- **Yedeğin ömrü:** Elle sildiğin bir brief, yedek ömrü dolana kadar yedekte kalır. Yedeği 7 gün tutarsan "brief'i X gün içinde silerim" cümlesi "yedeklerde ek 7 gün" notuyla yazılmalı.
- Şifreli yedeğin anahtarı yedekle aynı yerde durmamalı.

## 5. Sağlayıcı seçimi (seçilmedi; resmî sayfalardan okunanlar)

Sayfalar 2026-11-25'te okundu. **Fiyatlar değişir, KDV dahil/hariç hiçbir sayfada belirtilmiyor; satın almadan önce yeniden kontrol et.**

| Sağlayıcı | Okunan en küçük uygun plan | Veri merkezi | Yedek | Root |
|---|---|---|---|---|
| Hosting.com.tr, VPS - Small | 2 çekirdek, 2 GB, 50 GB NVMe; ₺177,99/ay (24 aylık alımda); aylık yenilemede $7,99/ay; 1 yıllıkta $3,99/ay | "Türkiye – İstanbul" 5 lokasyondan biri (diğerleri Atlanta, Düsseldorf, Londra, Paris): **lokasyon İstanbul seçilmeli** | "Ücretsiz Haftalık Yedekleme" (felaket kurtarma amaçlı, kullanıcı erişimi yok, destek talebiyle geri yükleme) | "Tam ROOT Erişimi" |
| Turkticaret, Ekonomik Paket | 1 çekirdek AMD EPYC, 1 GB, 20 GB SSD; ₺659,49/ay (liste ₺965,99) | "Vodafone Tuzla GSM Datacenter" (Türkiye, Tier III) | "Yedekleme İşlemleri" ek hizmet; fiyat belirtilmemiş | Belirtilmemiş |
| Dorabase | Fiyat yok, teklif isteniyor | "Türkiye lokasyonlu"; şehir belirtilmemiş | "Snapshot ve Yedekleme Çözümleri" listelenmiş; fiyat/yer belirtilmemiş | Belirtilmemiş |
| Veridyen, gnCloud SR-4 | 2 çekirdek, 8 GB, 120 GB; ₺1252,55/ay (bu iş için gereğinden büyük) | Şehir/ülke belirtilmemiş | Ücretli ek hizmet | Belirtilmemiş |
| Natro VPS Pro | ₺252,64/ay (sayfadaki gösterimden okunan) | **Hollanda** (elendi; Türkiye XCloud ürünü okunamadı) | Ücretsiz snapshot (yeri belirtilmemiş) | "Tam Root Erişimi" |
| İsimtescil VPS-XXS | $6,99/ay (12 aylık) | **Hollanda** (elendi; Türkiye VDS ürünü okunmadı) | Belirtilmemiş | Belirtilmemiş |
| Turhost | Sayfa okunamadı | - | - | - |

Okumadan çıkan: veri merkezinin Türkiye'de olduğu **açıkça yazılan** ve en küçük plan fiyatı belli olan iki aday Hosting.com.tr (İstanbul seçilirse) ve Turkticaret. Hosting.com.tr'de fiyat/özellik daha geniş ama düşük fiyat 24 aylık taahhütle; Turkticaret'te konum cümlesi net ama yedek fiyatı ve root bilgisi sayfada yok. **Satın almadan önce sağlayıcıya yazılı sor:** verinin fiziksel konumu (yedek dahil), KVKK kapsamında veri işleyen sözleşmesi, snapshot/yedeğin saklandığı yer, ISO 27001 belgesi.

## 6. Aylık maliyet (tahmini, doğrulama gerekli)

| Kalem | Tutar |
|---|---|
| VPS | yaklaşık ₺180 (24 aylık taahhütle, Hosting.com.tr) ile ₺660 (Turkticaret, aylık) arası; KDV belirtilmemiş |
| Alan adı alt alanı (`form.`) | Mevcut alan adın; ek ücret yok |
| TLS (Let's Encrypt) | Ücretsiz |
| Bildirim (ntfy uygulaması) | Ücretsiz |
| Yedek | Sağlayıcının ücretsiz haftalık yedeği (Hosting.com.tr) ya da kendi `scp` yedeğin; ek ücret yok |
| Vercel/Resend | Form buradan geçmediği için Resend'e gerek kalmaz (Vercel siteyi barındırmaya devam eder) |

## 7. Senden gereken kurulum

1. Sağlayıcıyı seç ve satın al (konum: Türkiye/İstanbul, Ubuntu veya Debian). Yukarıdaki yazılı soruları sor.
2. Alan adında `form` alt alanı için A kaydı: sunucunun IP adresi.
3. SSH ile giriş (parola yerine SSH anahtarı), `ufw` ile yalnızca 22, 80, 443; otomatik güvenlik güncellemeleri.
4. Node 22+ ve Caddy kur; `server/` klasörünü `/opt/form` altına kopyala.
5. `openssl rand -hex 32` ve `openssl rand -hex 24` ile `ENC_KEY` ve `ADMIN_TOKEN` üret; `/etc/form.env` dosyasına yaz (`chmod 600`). Bu değerleri bana veya repoya yazma.
6. `systemctl enable --now form`; `curl https://form.alan-adin.com/health` → `{"ok":true}`.
7. ntfy uygulamasını telefona kur, `NOTIFY_URL` konusuna abone ol.
8. Yedek betiği ve `scp` ile kendi bilgisayarına kopya (aylık geri yükleme denemesi).
9. Bittiğinde bana haber ver: sitede form adresini değiştirip sahte verilerle uçtan uca test eder, KVKK metinlerini yeni akışa göre güncelleriz.

Ben sunucuya erişmem; komutları sen çalıştırırsın.
