import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'InsectEat',
  webDir: 'dist',
  server: {
    androidScheme: 'http'   // 👈 cambiar a http
  },
  plugins: {
    CapacitorHttp: {
      enabled: false
    }
  }
};

export default config;