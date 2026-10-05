/**
 * `app.json` üzerine, yalnızca yayın amaçlı EAS derlemelerinde (preview/production) APK'yı küçültür:
 * yalnızca arm64-v8a (bugünkü Android telefonların neredeyse hepsi) derlenir.
 * Development build ve yerel çalıştırmada tüm mimariler korunur.
 */
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const slim = profile === 'preview' || profile === 'production';
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ...(slim ? [['expo-build-properties', { android: { buildArchs: ['arm64-v8a'] } }]] : []),
    ],
  };
};
