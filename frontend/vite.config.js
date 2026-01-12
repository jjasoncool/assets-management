import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// 加載環境變量
	const env = loadEnv(mode, process.cwd());

	return {
		plugins: [sveltekit()],
		resolve: {
			alias: {
				'$styles': './src/styles',
				'@': './src'
			}
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
