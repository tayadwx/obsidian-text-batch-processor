import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
const root = process.cwd();
const stubDir = '/tmp/pktest/stubs';
const resolveStub = {
  name: 'resolve-stub',
  setup(build){
    build.onResolve({filter: /^\.\/(io|delete-confirm|confirm-modal|import-modal)$/}, args => ({ path: path.join(stubDir, args.path + '.ts') }));
    build.onResolve({filter: /^obsidian$/}, () => ({ path: path.join(stubDir, 'obsidian.ts') }));
  }
};
const entry = { 'entry2.ts': '/tmp/pktest/entry2.ts' };
await esbuild.build({
  entryPoints: ['/tmp/pktest/entry2.ts'],
  bundle: true,
  outfile: '/tmp/pktest/bundle2.js',
  format: 'iife',
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [resolveStub],
  logLevel: 'info',
});
console.log('built');
