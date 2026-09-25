import {defineConfig} from 'vite';
// Immutable deployment asset URLs keep an open workshop usable during a new Git deployment.
export default defineConfig({base:process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}/`:'/'});
