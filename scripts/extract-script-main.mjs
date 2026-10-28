import fs from 'fs';
import vm from 'vm';

const scriptMain = fs.readFileSync('docs/script.js', 'utf8');

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
            console.log('Successfully captured script from script.js!');
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
  vm.runInContext(scriptMain, sandbox);
  if (capturedScript) {
    fs.writeFileSync('scripts/extracted_script_main.json', JSON.stringify(capturedScript, null, 2), 'utf8');
    console.log('Saved to scripts/extracted_script_main.json');
  }
} catch (err) {
  console.error('Error running script.js:', err);
}
