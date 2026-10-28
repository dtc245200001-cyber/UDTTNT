import fs from 'fs';
import vm from 'vm';

const scriptGen = fs.readFileSync('docs/script_general.js', 'utf8');

function createDeepMock(name = 'mock') {
  const fn = function(...args) {
    return createDeepMock(name + '()');
  };
  return new Proxy(fn, {
    get: (target, prop) => {
      if (prop === Symbol.toPrimitive) return () => name;
      if (prop === 'toString') return () => name;
      if (prop === 'valueOf') return () => name;
      return createDeepMock(`${name}.${String(prop)}`);
    }
  });
}

let capturedScript = null;

const sandbox = {
  window: {},
  document: {},
  TDV: new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'PlayerAPI') {
        return {
          defineScript: (s) => {
            capturedScript = s;
            console.log('Successfully captured script via TDV.PlayerAPI.defineScript!');
          }
        };
      }
      return createDeepMock(`TDV.${String(prop)}`);
    }
  }),
  console: console
};

vm.createContext(sandbox);

try {
  vm.runInContext(scriptGen, sandbox);
  if (capturedScript) {
    fs.writeFileSync('scripts/extracted_script_general.json', JSON.stringify(capturedScript, null, 2), 'utf8');
    console.log('Saved to scripts/extracted_script_general.json');
  } else {
    console.log('No captured script.');
  }
} catch (err) {
  console.error('Error running in vm:', err);
}
