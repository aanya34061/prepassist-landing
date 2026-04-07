import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prepassist.app',
  appName: 'PrepAssist',
  webDir: 'public',
  // Embedded Web Wrapper Mode 
  // Points the native shell to Next.js node instances directly. 
  server: {
    // Android emulator alias for localhost.
    url: 'http://10.0.2.2:3000', 
    // Uncomment the URL below for absolute Production Deployments!
    // url: 'https://prepassist.in',
    cleartext: true
  }
};

export default config;
