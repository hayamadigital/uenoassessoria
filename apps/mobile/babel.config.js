const path = require('path')
const fs = require('fs')

const envCandidates = [
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '../../../../apps/mobile/.env.local'),
]

for (const envPath of envCandidates) {
  if (!fs.existsSync(envPath)) continue
  require('dotenv').config({ path: envPath, override: true })
  break
}

module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
  }
}
