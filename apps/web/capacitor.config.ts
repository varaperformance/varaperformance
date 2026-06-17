import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.varaperformance.app",
  appName: "Vara Performance",
  webDir: "dist",
  ios: {
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      // Avoid holding the native splash longer than needed (we hide from JS).
      launchShowDuration: 0,
      backgroundColor: "#0B1020",
      showSpinner: false,
      androidScaleType: "FIT_CENTER",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DEFAULT",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#6D28D9",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    BackgroundRunner: {
      label: "com.varaperformance.health-sync",
      src: "background-runner.js",
      event: "healthSync",
      repeat: true,
      interval: 15,
      autoStart: true,
    },
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
    hostname: "varaperformance.com",
  },
};

export default config;
