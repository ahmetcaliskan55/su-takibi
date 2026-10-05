# Bağımlılık denetimi (npm audit)

Tarih: 2026-10-05 · Expo SDK 57 · `npm audit`: 60 uyarı (10 orta, 50 yüksek). Uyarıların çoğu zincir satırıdır; kök sebep yalnızca 4 advisory.

## Telefondaki uygulamaya giren (çalışma zamanı)

| Advisory | Paket (kurulu) | Zincir | Durum |
| --- | --- | --- | --- |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) (orta, DoS, CWE-400) | `decode-uri-component` 0.2.2 | `expo-router` → `query-string` 7.1.3 | **Açık.** Pakete (JS bundle) girdiği doğrulandı. |

- **Tetiklenme koşulu:** Hatalı biçimli, çok sayıda `%` dizisi içeren bir URL sorgusunun ayrıştırılması. Uygulamada bunun tek yolu `yudumla://` şemasıyla açılan harici bir bağlantıdır (telefondaki başka bir uygulama ya da web sayfası gönderebilir).
- **Etki:** JS iş parçacığı kısa/uzun süre donabilir. Veri sızıntısı veya veri bozulması yok; veriler cihazda, sunucu yok. Kullanıcı uygulamayı kapatıp açınca düzelir.
- **Kalan risk:** Düşük.
- **Neden düzeltilmedi:** Yamalı sürümler (0.4.3+/0.5.0) yalnızca ESM; `query-string@7` (CommonJS) onu yükleyemez, zorlamak yönlendirmeyi bozar. Kalıcı düzeltme `expo-router@58` (SDK 58) ile gelir; SDK 58 henüz kararlı değil (`expo` `latest` = 57) ve Expo Go mağaza sürümüyle açılmayabilir. SDK 58 kararlı olunca yükseltilecek.

## Yalnızca geliştirme / derleme araçları (telefona girmiyor)

Paket içeriği kaynak haritasıyla kontrol edildi: aşağıdakiler uygulama paketinde yok. Şimdilik değişiklik yapılmadı.

| Advisory | Paket | Bulaştığı yer | Not |
| --- | --- | --- | --- |
| GHSA-vfj7-8cjw-p6xm (yüksek, DoS) | `braces` 3.0.3 | jest, metro (`micromatch`) | npm'de yamalı sürüm yok (en son 3.0.3 de etkilenen aralıkta). Saldırgan kontrollü glob deseni gerekir. |
| GHSA-86w9-cpqp-85rv (yüksek, imza doğrulama) | `node-forge` 1.4.0 | `@expo/cli` (kod imzalama) | npm'de yamalı sürüm yok. Expo Updates kod imzalama kullanılmıyor. |
| GHSA-w5hq-g745-h8pq (orta) | `uuid` 7.0.3 | `xcode` ← `@expo/config-plugins` | Yalnızca `uuid.v4()` kullanılıyor; zafiyet v3/v5/v6'da, `buf` verilince. Erişilemez. |

`npm audit`'in önerdiği `expo@44`, `jest@30`, `react-native@0.72` gibi "düzeltmeler" sürüm düşürme / ana sürüm atlamasıdır ve gerçek sorunu çözmez; `npm audit fix --force` kullanılmaz.
