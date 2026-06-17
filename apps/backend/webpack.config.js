const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = function (options) {
  // Use transpileOnly to avoid ts-loader type-check failures caused by Prisma 7's
  // .js extension re-exports in generated files. Type safety is enforced separately
  // via `tsc --noEmit` (which resolves .js→.ts correctly with moduleResolution:nodenext).
  const rules = (options.module?.rules ?? []).map((rule) => {
    if (
      rule &&
      typeof rule === 'object' &&
      'use' in rule &&
      Array.isArray(rule.use)
    ) {
      return {
        ...rule,
        use: rule.use.map((u) =>
          u && typeof u === 'object' && u.loader && u.loader.includes('ts-loader')
            ? { ...u, options: { ...(u.options ?? {}), transpileOnly: true } }
            : u,
        ),
      };
    }
    return rule;
  });

  return {
    ...options,
    module: { ...options.module, rules },
    externals: [
      ...(options.externals || []),
      // Exclude native node modules from bundling
      function ({ request }, callback) {
        if (/\.node$/.test(request) || /@css-inline/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
    resolve: {
      ...options.resolve,
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
      plugins: [
        ...(options.resolve?.plugins || []),
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, 'tsconfig.json'),
        }),
      ],
    },
  };
};
