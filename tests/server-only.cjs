// Node integration tests execute server modules outside the Next bundler.
// Neutralize only its import-boundary marker; auth and business code remain real.
const marker = require.resolve("server-only");
require.cache[marker] = { id: marker, filename: marker, loaded: true, exports: {} };
