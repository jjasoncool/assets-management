import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'$styles': './src/styles',
			'@': './src'
		}
	},
	server: {
		host: '0.0.0.0',
		allowedHosts: ['assets.egst.com.tw'],
		watch: {
			// 減少不必要的文件監視
			ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
		}
	}
});
