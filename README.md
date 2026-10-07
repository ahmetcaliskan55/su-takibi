# 💧 Yudumla

**Yudumla, büyüt.**

Yudumla, günlük su tüketimini takip etmeyi ve düzenli su içme alışkanlığı kazanmayı kolaylaştıran mobil bir uygulamadır. Her gün yeni bir tohumla başlarsın; içtiğin suyu kaydettikçe günün bitkisi büyür.

## Problem

Yoğun bir günde su içmeyi unutmak çok kolay. Çoğu takip uygulaması hesap açmayı, internet bağlantısını ya da sürekli bildirim yağmurunu gerektirir. Yudumla bunu sade tutar: su kaydı birkaç dokunuşla girilir, günün durumu bir bitkiyle görünür hâle gelir, hatırlatmalar yalnızca uyanık olduğun saatlerde ve telefonun kendi içinde planlanır.

## Özellikler

- **Günlük su hedefi:** Hedef kullanıcı tarafından belirlenir ve değiştirilir (500–4.000 ml, 100 ml adımlarla). Hedef bir sağlık önerisi değildir; kişiye özel hesaplama yapılmaz.
- **Hızlı ekleme:** 150 / 250 / 500 ml düğmeleriyle tek dokunuşla kayıt.
- **Özel miktar ve saat:** İstenen miktar ve içme saatiyle kayıt; geçersiz, negatif ve gelecekteki saat girişleri doğrulanır.
- **Kayıt düzenleme ve silme:** Bugünün kayıtları listelenir, düzenlenir ve silinir.
- **Geri alma:** Ekleme, düzenleme ve silmeden sonra 7 saniyelik "Geri al".
- **Günlük ilerleme ve bitki gelişimi:** Hedefin %0 / %25 / %50 / %75 / %100'ünde tohum, filiz, yaprak, tomurcuk ve çiçek aşamaları. Bitki ölmez; hedefin üzerindeki miktar ek aşama vermez.
- **Geçmiş ve takvim:** Her günün bitkisi ve yüzdesi, o günün kendi hedefine göre gösterilir. Hedef sonradan değişse de geçmiş günler değişmez.
- **7 ve 30 günlük istatistikler:** Günlük ortalama, hedefi tamamlanan gün sayısı ve her günün hedef çizgisiyle çubuk grafik.
- **Yerel hatırlatmalar:** Yalnızca uyanık saatlerde (gece yarısını aşan aralıklar dahil, ör. 08:00–01:00), seçilen aralıkta (1–4 saat), telefonda planlanır.
- **Nazik / Komik mesaj tarzı:** Hatırlatmalar zamanla biraz daha takılır ama hakaret, suçlama ya da aşırı su içmeye teşvik içermez.
- **Hedef tamamlanınca durma:** O günün hedefi tamamlanınca o günün hatırlatmaları durur; su kaydı girilince sayım sıfırlanır.
- **Tüm verileri silme:** Onayla kayıtlar, profil ve ayarlar cihazdan silinir, planlı bildirimler iptal edilir.

Bildirim izni reddedilse bile uygulama tam olarak kullanılabilir.

## Teknolojiler

| Alan | Teknoloji | Sürüm |
| --- | --- | --- |
| Çatı | React Native, Expo | RN 0.86, Expo SDK ~57 |
| Dil | TypeScript (strict) | ~6.0 |
| Yönlendirme | Expo Router | ~57.0 |
| Yerel veritabanı | expo-sqlite | ~57.0 |
| Yerel bildirimler | expo-notifications | ~57.0 |
| Çizim | react-native-svg | 15.15 |
| Test | Jest, jest-expo, Testing Library (`@testing-library/react-native`), sql.js | Jest 29 |

Derleme için Expo Application Services (EAS Build) kullanılır. Uygulamanın kendisi hiçbir sunucuya bağlanmaz.

## Mimari

Uygulama yalnızca arayüzden ibaret değildir; kurallar, veri ve işletim sistemi işleri ayrı katmanlardadır:

```text
src/
├── domain/         Saf iş mantığı (React ve Expo'dan bağımsız, doğrudan test edilir):
│                   tarih/yerel gün, bitki aşamaları, doğrulama, mesaj metinleri,
│                   geçmiş/istatistik hesapları ve hatırlatma planlayıcısı
├── db/             SQLite arayüzü, sürümlü migration'lar, depo katmanı (kayıtlar,
│                   günlük hedef anlık görüntüsü, ayarlar), işlem ve kilit yönetimi
├── notifications/  İşletim sistemi katmanı: expo-notifications sürücüsü, izin akışı,
│                   planı uygulayan eşitleme (iptal et → yeniden planla)
├── state/          Sağlayıcılar ve kancalar (veritabanı, ayarlar, bugünün verisi)
├── components/     Ekran bileşenleri (B tasarımı: krem/yeşil tema, bitki çizimi)
├── app/            Expo Router ekranları: Bugün, Geçmiş, Ayarlar, Profil
└── theme/          Renkler ve paketlenmiş yazı tipleri
```

Öne çıkan tasarım kararları:

- **Hatırlatma planı saf bir fonksiyondur.** `domain/reminders.ts` zaman ve durumdan "hangi saatte hangi mesaj" listesini hesaplar; bildirimleri oluşturup iptal eden kod ayrı katmandadır (`notifications/`). Böylece planlama gerçek cihaz olmadan test edilir.
- **Yerel takvim günü esastır.** Kayıtlar `YYYY-MM-DD` yerel gün anahtarı ve günün dakikasıyla saklanır; gece yarısı ve saat dilimi değişikliklerinde kayıtlar yanlış güne düşmez.
- **Günün hedefi dondurulur.** Her günün hedefi o güne ait satırda saklanır; hedef değişince yalnızca bugün güncellenir. Uygulama günlerce açılmasa bile eksik günler önceki günün hedefiyle oluşturulur.
- **Güvenli veri işlemleri.** Ekleme, güncelleme, silme ve "tüm verileri sil" işlemleri tek veritabanı işleminde yapılır; hata olursa kısmi yazma kalmaz.
- **Sınırlı plan.** iOS'un yerel bildirim sınırı gözetilerek en çok 3 gün / 48 bildirim planlanır; uygulama açıldıkça plan yenilenir. Ayrıntı: [`docs/notifications.md`](docs/notifications.md).

## Kurulum

Gereksinimler: [Node.js](https://nodejs.org) (LTS), Git ve bir Android telefon.

> **Uygulama Expo Go ile çalışmaz.** `expo-notifications`, Android'de Expo Go'da yüklenirken hata verir (Expo SDK 53'ten beri). Uygulamayı çalıştırmak için bir **development build** (özel bir APK) gerekir.

```bash
git clone https://github.com/ahmetcaliskan55/yudumla.git
cd yudumla
npm ci
```

**1. Development build üretin** (ücretsiz bir [Expo](https://expo.dev) hesabı gerekir; derleme bulutta yapılır):

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build --profile development --platform android
```

Derleme bitince verilen bağlantıdan APK'yı telefonunuza indirip kurun. Kendi hesabınızla derliyorsanız `app.json` içindeki `android.package` değerini kendi paket kimliğinizle değiştirin.

**2. Geliştirme sunucusunu başlatın** (telefon ve bilgisayar aynı ağda olmalı):

```bash
npx expo start --dev-client
```

Telefondaki Yudumla uygulamasını açıp sunucuya bağlanın. Kod değişiklikleri APK'yı yeniden kurmadan yansır.

**Bağımsız APK** (bilgisayarsız ve internetsiz çalışan, yalnızca `arm64-v8a`):

```bash
npx eas-cli build --profile preview --platform android
```

Yerel derleme için Android Studio ve JDK gerekir; bu yöntem bu depoda denenmedi, EAS yöntemi doğrulandı. **iOS henüz test edilmedi.**

## Testler

```bash
npm run typecheck   # TypeScript denetimi (strict)
npm run lint        # ESLint (Expo ayarlarıyla)
npm test            # Jest
npm run check       # üçü art arda
```

Son doğrulanan durum: TypeScript kontrolü ve lint temiz; **322 test / 20 test dosyası** geçiyor. Testler alan mantığını (bitki eşikleri, doğrulama, tarih sınırları, hatırlatma planı), veritabanı katmanını (migration, depo, işlem geri alma), arayüz bileşenlerini ve ekranlar arası akışları kapsar. SQL testleri, yerel derleme gerektirmemesi için WebAssembly tabanlı `sql.js` ile aynı migration'ları çalıştırır; gerçek cihazdaki `expo-sqlite` sürücüsü ve bildirimlerin teslimi telefonda ayrıca elle denenir.

## Gizlilik

- Profil, su kayıtları ve ayarlar yalnızca cihazdaki yerel SQLite veritabanında tutulur.
- Hesap, sunucu (backend), reklam ya da analitik yoktur; uygulama kodunda ağ çağrısı bulunmaz ve internetsiz çalışır.
- Hatırlatmalar telefonda yerel olarak planlanır; uzak bir bildirim servisi kullanılmaz.
- Ayarlar'daki **Tüm verilerimi sil** seçeneği kayıtları ve profili cihazdan kalıcı olarak siler.

## Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır. Uygulamada kullanılan Fredoka ve Nunito yazı tiplerinin lisansları (SIL Open Font License 1.1) [`licenses/`](licenses/) klasöründedir.
