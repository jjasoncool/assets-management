import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// 加載環境變量
	const env = loadEnv(mode, process.cwd());
	const isProduction = mode === 'production';

	return {
		plugins: [sveltekit()],
		resolve: {
			alias: {
				'$styles': './src/styles',
				'@': './src'
			}
		},
		build: {
			// 完全禁用所有 source map
			sourcemap: false,
			cssMinify: true,
			minify: true
		},
		css: {
			// 禁用 CSS source map
			devSourcemap: false
		},
		server: {
			host: '0.0.0.0',
			allowedHosts: env.VITE_ALLOWED_HOSTS ? env.VITE_ALLOWED_HOSTS.split(',').map(host => host.trim()) : [],
			watch: {
				// 減少不必要的文件監視
				ignored: ['**/node_modules/**', '**/.pnpm-store/**', '**/.git/**', '**/dist/**']
			}
		}
	};
});
