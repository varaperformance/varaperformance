import { registerAs } from '@nestjs/config';

export default registerAs('oauth', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientIdIos: process.env.GOOGLE_CLIENT_ID_IOS,
    clientIdAndroid: process.env.GOOGLE_CLIENT_ID_ANDROID,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID, // Your app's bundle ID
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY, // Contents of .p8 file
  },
}));
