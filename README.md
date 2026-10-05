# Yudumla 🌱

**Yudumla, büyüt.**

Android ve iOS için tek kod tabanıyla (React Native + Expo + TypeScript) geliştirilen, günlük su tüketimini sanal bitki büyümesiyle takip eden mobil uygulama. Üyelik, sunucu, reklam ve analitik yoktur; veriler cihazdaki SQLite veritabanında tutulur ve uygulama internetsiz çalışır.

## Mevcut durum: Aşama 1

Çalışanlar:

- **Bugün ekranı:** 150 / 250 / 500 ml hızlı ekleme, toplam, kalan, yüzde, beş aşamalı bitki (tohum → filiz → yaprak → tomurcuk → çiçek) ve son kayıt.
- Yerel SQLite: şema + migration altyapısı, günün **hedef anlık görüntüsü** ve su kayıtları. Kayıtlar uygulama kapatılıp açılınca korunur.
- Günler yerel takvim gününe göre ayrılır; uygulama öne gelince ve gece yarısında gün yeniden hesaplanır.
- Alt gezinme (Bugün / Geçmiş / Ayarlar). Geçmiş ve Ayarlar şimdilik yalnızca "sonraki aşamada geliyor" yer tutucusudur.
- Yüklenme ve veritabanı hatası ekranları.

Henüz yok: ilk kurulum, profil, özel miktar paneli, kayıt düzenleme/silme/geri alma, geçmiş, ayarlar, bildirimler, tüm verileri silme.

> **Günlük hedef (2.000 ml) yalnızca geliştirme varsayılanıdır.** Kişiye özel bir öneri veya tıbbi ihtiyaç değildir. Yaş/kilo/aktiviteye göre hedef önerisi, kaynakları değerlendirildikten sonra ayrı bir aşamada ele alınacaktır; doğrulanmamış formül kullanılmaz.

## Çalıştırma (Windows + Android telefon, Expo Go)

Gereksinimler: [Node.js LTS](https://nodejs.org), Git, telefonda **Expo Go** (Play Store).

```powershell
git clone https://github.com/ahmetcaliskan55/su-takibi.git
cd su-takibi
git checkout claude/zen-newton-skpxky
npm install
npx expo start
```

Telefon ve bilgisayar aynı Wi-Fi'deyse çıkan QR kodu Expo Go ile okutun. Ağ bağlantısı kurulamazsa `npx expo start --tunnel` deneyin.

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
- `design/prototype.html` — tasarım prototipi (referans; değiştirilmez)

## Tasarım

Seçilen tasarım **B — Sevimli Günlük Saksı**: krem ve yeşil renkler, yuvarlak kartlar, sevimli bitki, komik Türkçe metinler. `design/prototype.html` dosyasını tarayıcıda açın; dosyada eski A/C alternatifleri de bulunur ve uygulamaya alınmayacaktır. Prototipteki tarihler, geçmiş ve izin davranışları demo verisidir ve uygulamaya taşınmaz.

## Notlar

- Fontlar (Fredoka, Nunito; SIL OFL 1.1) uygulamayla paketlenir; lisans metinleri `licenses/` klasöründedir. Pakettaki Fredoka'da ğ/ş/İ glifleri yoktur; bu harfleri içeren başlıklarda Nunito kullanılır (bkz. `src/theme/fonts.ts`).
- Uygulama adı **Yudumla**. Mağaza adı ve paket kimliği (Android `applicationId` / iOS bundle id) yayın aşamasından önce kesinleştirilecek.
- Uygulama simgeleri Expo şablonundan gelen geçici yer tutuculardır.
- Kişisel kayıtları, yerel veritabanlarını ve gizli anahtarları repoya eklemeyin.
