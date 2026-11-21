# JS köprüsü (AndroidBridge) yöntemleri silinmesin/yeniden adlandırılmasın
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface
