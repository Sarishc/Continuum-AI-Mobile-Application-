const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.platforms = ['ios', 'android', 'web'];

// Explicitly ensure require.context is enabled for expo-router web route discovery
config.transformer.unstable_allowRequireContext = true;

const pagerStub = path.resolve(__dirname, 'web-stubs/react-native-pager-view.js');

// Stub empty native modules for web
const nativeOnlyStub = path.resolve(__dirname, 'web-stubs/native-stub.js');

const origResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform, ...rest) => {
  if (platform === 'web') {
    // Stub entire pager-view package + any internal paths
    if (
      moduleName === 'react-native-pager-view' ||
      moduleName.startsWith('react-native-pager-view/')
    ) {
      return { filePath: pagerStub, type: 'sourceFile' };
    }
    // Stub native-only React Native internal modules
    if (
      moduleName.includes('codegenNativeCommands') ||
      moduleName.includes('codegenNativeComponent') ||
      moduleName.includes('NativeModules') && moduleName.includes('codegenNative')
    ) {
      return { filePath: nativeOnlyStub, type: 'sourceFile' };
    }
  }
  if (origResolveRequest) {
    return origResolveRequest(context, moduleName, platform, ...rest);
  }
  return context.resolveRequest(context, moduleName, platform, ...rest);
};

module.exports = config;
