const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('txt');   // .txt uzantılı dosyaları asset olarak tanımlıyoruz

module.exports = config; 