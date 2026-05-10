const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch only the shared packages (not entire monorepo root)
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/firebase'),
  path.resolve(monorepoRoot, 'packages/types'),
  path.resolve(monorepoRoot, 'packages/utils'),
  path.resolve(monorepoRoot, 'packages/i18n'),
]

// Resolve from mobile first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Force single copy of React and React Native (react-dom excluded — web only, not for iOS bundle)
config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
}

module.exports = config
