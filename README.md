# Su Takibi 🌱

Android ve iOS için planlanan, günlük su tüketimini sanal bitki büyümesiyle takip eden mobil uygulama.

## Mevcut durum

Bu repo şu anda tasarım prototipini içerir. Çalışan mobil uygulama, SQLite depolama ve gerçek yerel bildirimler henüz geliştirilmemiştir.

`prototype.html` dosyasını tarayıcıda açın. Seçilen tasarım **B — Sevimli Günlük Saksı**; dosyada önceki A/C alternatifleri de bulunmaktadır. Tarihler, geçmiş ve izin davranışları demo verisidir.

## Planlanan özellikler

- Elle su kaydı; kayıt düzenleme, silme ve geri alma.
- Günlük hedefe göre tohum, filiz, yaprak, tomurcuk ve çiçek aşamaları.
- Her gün yeni tohum; önceki günlerin kayıtları ve bitkileri geçmişte korunur.
- Özelleştirilebilir, komik mesajlı yerel hatırlatmalar.
- Geçmiş, istatistikler, profil ve ayarlar.
- Üyeliksiz ve çevrimdışı kullanım; veriler cihazdaki SQLite veritabanında tutulur.
- Tüm verileri silme seçeneği; ayrı backend, reklam veya analitik servis yok.

## Geliştirme notları

Mobil teknoloji henüz seçilmedi. HTML görünüm ve akış referansıdır; doğrudan mobil uygulama değildir. Demo tarihleri ve örnek kayıtlar gerçek uygulamaya taşınmamalıdır. Su hedefi hesaplama yöntemi doğrulanmalı; demo hedefleri sağlık önerisi değildir.

Kişisel kayıtları, yerel veritabanlarını ve gizli anahtarları repoya eklemeyin. Görsel/font kullanım hakları public paylaşım öncesinde kontrol edilmelidir.
