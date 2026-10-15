import fs from 'node:fs';
import path from 'node:path';
export const root = path.resolve(import.meta.dirname, '..');
export const upstream = path.join(root, 'upstream/mouse-protocol');
const manifest = JSON.parse(fs.readFileSync(path.join(upstream, 'package.json'), 'utf8'));
export const resolveProtocol = {
  name: 'source-protocol',
  setup(build) {
    build.onResolve({filter: /^@openmouse\/protocol(?:\/.*)?$/}, args => {
      const key = args.path.replace('@openmouse/protocol', '.') || '.';
      const exp = manifest.exports[key];
      if (!exp) throw Error('Missing protocol export: '+key);
      const target = (typeof exp === 'string' ? exp : exp.import).replace('./dist/', './src/').replace(/\.js$/, '.ts');
      return {path: path.resolve(upstream, target)};
    });
  }
};
export const options = {bundle:true, target:'es2022', tsconfig:path.join(upstream,'tsconfig.json'), plugins:[resolveProtocol], legalComments:'inline'};
