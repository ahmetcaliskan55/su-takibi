# Yudumla 🌱

**Yudumla, büyüt.**

Android ve iOS için tek kod tabanıyla (React Native + Expo + TypeScript) geliştirilen, günlük su tüketimini sanal bitki büyümesiyle takip eden mobil uygulama. Üyelik, sunucu, reklam ve analitik yoktur; veriler cihazdaki SQLite veritabanında tutulur ve uygulama internetsiz çalışır.

## Mevcut durum: Aşama 4

Çalışanlar:

- **Bugün ekranı:** 150 / 250 / 500 ml hızlı ekleme, toplam, kalan, yüzde, beş aşamalı bitki (tohum → filiz → yaprak → tomurcuk → çiçek), son kayıt.
- **İlk kurulum (ilk açılışta bir kez):** tanışma, isteğe bağlı profil (yaş, kilo, aktivite), günlük hedef ve bardak miktarı, hatırlatma tercihleri (uyanma/uyuma saati gece yarısını aşabilir). Bildirim izni henüz istenmez; hatırlatmalar sonraki sürümde.
- **Hedef ve profil ekranı:** Bugün ekranındaki hedefe ya da Ayarlar'a dokununca açılır; kendiliğinden kaydeder. Hedef değişimi yalnızca bugünü etkiler, önceki günlerin hedefi korunur.
- **Geçmiş:** 5 haftalık takvim (Pazartesi başlar; hücrede o günün bitkisi ve yüzdesi, gün ayrıntısı salt okunur) ve son 7/30 gün istatistiği (günlük ortalama, hedef tamam sayısı, çubuk grafik, her günün kendi hedef çizgisi). Bitki ve yüzde, o günün dondurulmuş hedefine göre hesaplanır.
- **Gün değişimi:** Uygulama günlerce açılmasa da eksik günler önceki günün hedefiyle, 0 ml olarak oluşturulur.
- **Su ekle paneli:** özel miktar (10–2.000 ml) ve içme saati; boş, geçersiz, negatif ve gelecekteki saat girişleri doğrulanır.
- **Bugünkü kayıtlar:** saat ve miktarla liste; her kayıt düzenlenebilir ve silinebilir.
- **Geri al:** ekleme, düzenleme ve silmeden sonra 7 saniyelik bildirim; yalnızca o son işlemi tersine çevirir. Veritabanı işlemi başarısız olursa başarı mesajı gösterilmez.
- Yerel SQLite: şema + migration altyapısı, günün **hedef anlık görüntüsü** ve su kayıtları. Kayıtlar uygulama kapatılıp açılınca korunur.
- Günler yerel takvim gününe göre ayrılır; uygulama öne gelince ve gece yarısında gün yeniden hesaplanır.
- Alt gezinme (Bugün / Geçmiş / Ayarlar). Ayarlar'ın geri kalanı şimdilik "sonraki aşamada geliyor" yer tutucusudur.

Henüz yok: ayarlar, bildirimler, tüm verileri silme, geçmiş güne kayıt ekleme/düzenleme.

> **Günlük hedef (2.000 ml) yalnızca geliştirme varsayılanıdır.** Kişiye özel bir öneri veya tıbbi ihtiyaç değildir. Yaş/kilo/aktiviteye göre hedef önerisi, kaynakları değerlendirildikten sonra ayrı bir aşamada ele alınacaktır; doğrulanmamış formül kullanılmaz.

## Çalıştırma (Windows + Android telefon, Expo Go)

Gereksinimler: [Node.js LTS](https://nodejs.org), Git, telefonda **Expo Go** (Play Store).

```powershell
git clone https://github.com/ahmetcaliskan55/yudumla.git
cd yudumla
git checkout claude/zen-newton-skpxky
npm ci
npx expo start
```

Telefon ve bilgisayar aynı Wi-Fi'deyse çıkan QR kodu Expo Go ile okutun. Ağ bağlantısı kurulamazsa `npx expo start --tunnel` deneyin.

`npm ci` Windows'ta C++ derleme araçları gerektirmez (testler WebAssembly tabanlı `sql.js` kullanır).

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run typecheck` | TypeScript (strict) tür denetimi |
| `npm run lint` | ESLint (Expo ayarlarıyla) |
| `npm test` | Jest testleri |
| `npm run check` | Üçünü art arda çalıştırır |

## Klasörler

- `src/app/` — ekranlar ve gezinme (Expo Router)
- `src/domain/` — saf mantık: tarih, bitki aşaması, doğrulama, mesajlar (test edilir, Expo'dan bağımsız)
- `src/db/` — SQLite arayüzü, migration'lar, depo katmanı
- `src/state/` — veritabanı sağlayıcısı, `useToday`, servis
- `src/components/`, `src/theme/` — B tasarımının bileşenleri, renkleri ve fontları
- `docs/dependency-audit.md` — `npm audit` bulguları ve değerlendirmesi
- `design/prototype.html` — tasarım prototipi (referans; değiştirilmez)

## Tasarım

Seçilen tasarım **B — Sevimli Günlük Saksı**: krem ve yeşil renkler, yuvarlak kartlar, sevimli bitki, komik Türkçe metinler. `design/prototype.html` dosyasını tarayıcıda açın; dosyada eski A/C alternatifleri de bulunur ve uygulamaya alınmayacaktır. Prototipteki tarihler, geçmiş ve izin davranışları demo verisidir ve uygulamaya taşınmaz.

## Notlar

- Fontlar (Fredoka, Nunito; SIL OFL 1.1) uygulamayla paketlenir; lisans metinleri `licenses/` klasöründedir. Pakettaki Fredoka'da ğ/ş/İ glifleri yoktur; bu harfleri içeren başlıklarda Nunito kullanılır (bkz. `src/theme/fonts.ts`).
- Uygulama adı **Yudumla**. Mağaza adı ve paket kimliği (Android `applicationId` / iOS bundle id) yayın aşamasından önce kesinleştirilecek.
- Uygulama simgeleri Expo şablonundan gelen geçici yer tutuculardır.
- Kişisel kayıtları, yerel veritabanlarını ve gizli anahtarları repoya eklemeyin.
