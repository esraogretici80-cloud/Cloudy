# Cloudy – Debug APK kurulum notları

Bu sürümde yapılanlar:
- ChatGPT tarzı yeni tasarım (giriş ekranı, sohbet ekranı, yan menü, yeni simge).
- Giriş ekranındaki ipucu/kurulum kutuları kaldırıldı.
- GitHub, X ve Facebook girişi: yarım kalan girişin otomatik tamamlanması, aynı e-postalı hesapların otomatik bağlanması, anlaşılır hata mesajları. Google girişi ve mevcut giriş akışı değişmedi.
- App Check: debug APK her cihazda aynı sabit anahtarı kullanır; reddedilen yapay zekâ istekleri otomatik olarak bir kez yeniden denenir; sohbet ekranındaki uyarı bandı kaldırıldı.
- Derleyici uyarıları temizlendi.

## Firebase Console'da bir kez yapılacaklar

1. **App Check debug anahtarı**
   Firebase Console → App Check → Uygulamalar → com.aistudio.genixai.k7m2vx → ⋮ → *Manage debug tokens* → *Add debug token*:

       192F83BA-171B-40D8-BB1D-F17B9A879E4C

2. **İmza parmak izleri** (Google, GitHub, X, Facebook girişi için)
   Firebase Console → Proje ayarları → Android uygulaması → *Add fingerprint*:

       SHA-1:   59:2B:DB:84:AD:E2:5A:90:7B:4D:C2:F7:24:BF:E8:C9:3C:F2:55:41
       SHA-256: AA:EB:22:63:92:09:0A:89:25:51:A6:D2:5A:45:2C:79:E6:25:8F:94:2F:A2:17:68:EB:1F:6F:DE:5A:F1:69:08

   Bu APK, proje kökündeki `debug.keystore` ile imzalandı. Aynı dosyayı saklarsanız sonraki derlemeler de aynı parmak izini kullanır.

3. **Sağlayıcılar** – Authentication → Sign-in method:
   - GitHub / X / Facebook etkin olmalı ve Client ID / Secret girilmiş olmalı.
   - Her sağlayıcının geliştirici panelinde geri dönüş adresi:
     `https://gen-lang-client-0683046785.firebaseapp.com/__/auth/handler`

## Derleme

    ./gradlew assembleDebug        # veya: gradle assembleDebug
    # Farklı App Check anahtarı: -PcloudyAppCheckDebugToken=ANAHTAR
