# Hatırlatma bildirimleri

Yerel bildirimler: sunucu, hesap ve internet yok. Planlama saf bir fonksiyondur (`src/domain/reminders.ts`); işletim sistemine bildirim oluşturma/iptal işleri ayrı katmandadır (`src/notifications/`).

## Nasıl çalışır
- Hatırlatmalar yalnızca uyanık saatlerde gelir (uyanma → uyuma; uyuma saati uyanmadan önceyse gece yarısını aşar, ör. 08:00–01:00). Uyuma → uyanma arası sessizdir.
- Sayım son su kaydından (kayıt yoksa uyanma saatinden) başlar; her aralıkta (varsayılan 2 saat) bir bildirim, seviye 1 → 4. Dördüncü seviyeden sonra ton sertleşmez.
- Su kaydı eklenince/düzenlenince/silinince/geri alınınca plan baştan hesaplanır (seviye 1'e döner).
- O günün hedefi tamamlanınca o günün (gece yarısını aşan kuyruğu dahil) hatırlatmaları kalkar; ertesi günküler kalır.
- Saat, aralık, hedef, mesaj tarzı, açık/kapalı ya da izin değişince; uygulama açılınca/öne gelince ve gece yarısında plan yenilenir: önce hepsi iptal edilir, sonra yenisi oluşturulur (yinelenen bildirim kalmaz).
- Bildirim izni yoksa hiçbir şey planlanmaz; uygulama izinsiz de kullanılabilir.

## Uygulama uzun süre açılmazsa
Uygulama kapalıyken kod çalışmaz; bildirimler önceden planlanır. Bu yüzden plan sınırlıdır:
- En çok **3 gün** ileriye ve **48 bildirime** kadar planlanır (iOS bir uygulamada en çok 64 yerel bildirim tutar).
- Planın sonuna tek bir "Hatırlatmalar bir süre duraklıyor. Uygulamayı açarsan yeniden başlarım" bildirimi eklenir; kullanıcı neden durduğunu bilir.
- Uygulama her açıldığında/öne geldiğinde plan yeniden kurulur, yani kullanıcı uygulamayı birkaç günde bir açtığı sürece hatırlatmalar sürer.
- Arka plan görevi (uygulama açılmadan planı uzatma) kullanılmıyor: işletim sistemi bunu garanti etmiyor ve pil/izin maliyeti var. Gerekirse sonradan değerlendirilir.

## Platform notları
**Android**
- Android 13+ `POST_NOTIFICATIONS` çalışma zamanı izni ister. İzin penceresi çıkmadan önce bildirim kanalı ("Su hatırlatmaları") oluşturulur.
- İki kez reddedilirse sistem yeniden sormaz; uygulama "Telefon ayarlarını aç" düğmesi gösterir.
- Tam zamanlı alarm izni kullanılmaz; bildirimler "yaklaşık zamanlı"dır, pil tasarrufu/Doze bazen geciktirebilir (üreticiye göre değişir: Xiaomi, Samsung, vb.).
- Uygulama "zorla durdurulursa" planlı bildirimler uygulama yeniden açılana kadar çalışmayabilir.

**iOS**
- İzin penceresi yalnızca bir kez çıkar; reddedilirse yalnızca Ayarlar'dan açılır.
- En çok 64 planlı yerel bildirim.
- Odak modları ve bildirim özeti zamanlamayı etkileyebilir.

## Tanılama (Ayarlar → Hatırlatmalar)
- **Planlı hatırlatma: N · sıradaki: SS.DD:** işletim sisteminde gerçekten kaç bildirimin planlı olduğunu ve en yakınının saatini gösterir. "Planlı hatırlatma yok" ise sorun planlamada (izin, kapalı anahtar, saat aralığı); sayı varsa ama bildirim gelmiyorsa sorun teslimatta (telefonun bildirim/pil ayarları).
- **Test bildirimi gönder:** 5 saniye sonra bir deneme bildirimi gösterir; izin ve kanal sorunlarını zamanlamadan ayırır.
- **"Bu saatlerde hiç hatırlatma gelmez":** uyanık süre hatırlatma aralığından uzun değilse (ilk hatırlatma = uyanma + aralık, uyuma saatinde ya da sonrasında kalır) görünür.

## Cihazda test edilmesi gerekenler
Bu davranışlar otomatik testlerde bellek içi sahte sürücüyle doğrulandı; gerçek bildirimlerin gelmesi telefonda denenmelidir:
1. İzin penceresi (Android 13+) ve reddedilince banner + "Telefon ayarlarını aç".
2. Bildirimin gerçekten gelmesi (ör. aralık 1 saat, uyanık saat aralığını kısa tutarak).
3. Su kaydı sonrası sayacın sıfırlanması; hedef tamamlanınca bugünün hatırlatmalarının durması.
4. Telefonu yeniden başlatma, uygulamayı kapatma, pil tasarrufu.
5. Expo Go'da bildirimler beklendiği gibi gelmezse (Expo Go sınırlıdır) development build gerekir.
