const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable wasm asset support for expo-sqlite on Web
config.resolver.assetExts.push('wasm');

module.exports = config;
