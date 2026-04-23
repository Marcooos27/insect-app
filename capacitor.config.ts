import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'InsectEat',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowNavigation: [
      "http://13.63.160.85",
    ]   
  },
  plugins: {
    CapacitorHttp: {
      enabled: false
    }
  }
};

export default config;