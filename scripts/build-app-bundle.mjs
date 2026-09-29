import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = "app.js";
const moduleCache = new Map();
const importPattern = /^\s*import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm;

function parseImportBindings(clause, importer) {
  const bindings = [];
  const trimmed = clause.trim();
  if (!trimmed) throw new Error(`빈 import 구문: ${importer}`);
  if (trimmed.startsWith("{")) {
    if (!trimmed.endsWith("}")) throw new Error(`지원하지 않는 named import 구문: ${importer}`);
    for (const item of trimmed.slice(1, -1).split(",").map(value => value.trim()).filter(Boolean)) {
      const match = item.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      if (!match) throw new Error(`지원하지 않는 import 항목 '${item}': ${importer}`);
      bindings.push({ imported: match[1], local: match[2] || match[1] });
    }
    return bindings;
  }
  const namespace = trimmed.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
  if (namespace) return [{ imported: "*", local: namespace[1] }];
  const defaultAndNamed = trimmed.match(/^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]*\})$/);
  if (defaultAndNamed) {
    bindings.push({ imported: "default", local: defaultAndNamed[1] });
    return [...bindings, ...parseImportBindings(defaultAndNamed[2], importer)];
  }
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) return [{ imported: "default", local: trimmed }];
  throw new Error(`지원하지 않는 import 형식 '${trimmed}': ${importer}`);
}

function findTopLevelBindings(source, moduleName) {
  const declarations = [...source.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:export\s+)?(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)];
  const bindings = new Set(declarations.map(match => match[1] || match[2]));
  for (const match of source.matchAll(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
    const afterBody = source.slice(match.index + match[0].length);
    const opening = afterBody.indexOf("{");
    if (opening < 0) continue;
    let depth = 0, quote = "", escaped = false;
    for (const char of afterBody.slice(opening)) {
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === "\\\"" || char === "'" || char === "`") { quote = char; continue; }
      if (char === "{") depth++;
      if (char === "}" && --depth === 0) break;
    }
  }
  return bindings;
}

async function loadModule(fileName) {
  if (moduleCache.has(fileName)) return moduleCache.get(fileName);
  const absolutePath = resolve(root, "js", fileName);
  const original = (await readFile(absolutePath, "utf8")).replace(/^\uFEFF/, "");
  const imports = [];
  const withoutImports = original.replace(importPattern, (_statement, clause, specifier) => {
    if (!specifier.startsWith("./")) throw new Error(`번들 외부 import는 사용할 수 없습니다: ${specifier} (${fileName})`);
    const dependency = basename(resolve(dirname(absolutePath), specifier));
    imports.push({ dependency, bindings: parseImportBindings(clause, fileName) });
    return "";
  });
  if (/^\s*import\s/m.test(withoutImports)) throw new Error(`변환되지 않은 import 문이 있습니다: ${fileName}`);

  const exports = [];
  const exportListPattern = /^\s*export\s*\{([^}]+)\}\s*;?\s*$/gm;
  let source = withoutImports.replace(exportListPattern, (_statement, names) => {
    for (const item of names.split(",").map(value => value.trim()).filter(Boolean)) {
      const match = item.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      if (!match) throw new Error(`지원하지 않는 export 항목 '${item}': ${fileName}`);
      exports.push({ local: match[1], exported: match[2] || match[1] });
    }
    return "";
  });
  source = source.replace(/^\s*export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)/gm, "");
  if (/^\s*export\s/m.test(source)) throw new Error(`지원하지 않는 export 문이 있습니다: ${fileName}`);

  const declaredNames = findTopLevelBindings(source, fileName);
  for (const match of withoutImports.matchAll(/^export\s+(?:(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|(?:const|let|var|class)\s+([A-Za-z_$][\w$]*))/gm)) {
    const name = match[1] || match[2];
    if (!declaredNames.has(name)) throw new Error(`export 선언을 찾을 수 없습니다: ${name} (${fileName})`);
    exports.push({ local: name, exported: name });
  }
  const exportedNames = new Set();
  for (const item of exports) {
    if (!declaredNames.has(item.local)) throw new Error(`export 식별자를 찾을 수 없습니다: ${item.local} (${fileName})`);
    if (exportedNames.has(item.exported)) throw new Error(`중복 export 이름: ${item.exported} (${fileName})`);
    exportedNames.add(item.exported);
  }
  const localNames = new Set();
  for (const imported of imports.flatMap(item => item.bindings)) {
    if (localNames.has(imported.local)) throw new Error(`중복 import 변수명: ${imported.local} (${fileName})`);
    if (declaredNames.has(imported.local)) throw new Error(`import/local 변수 충돌: ${imported.local} (${fileName})`);
    localNames.add(imported.local);
  }
  const record = { fileName, source, imports, exports, dependencies: [] };
  moduleCache.set(fileName, record);
  for (const imported of imports) record.dependencies.push(await loadModule(imported.dependency));
  return record;
}

const entryModule = await loadModule(entry);
const sortedModules = [];
const visitState = new Map();
function visit(module) {
  const state = visitState.get(module.fileName);
  if (state === "done") return;
  if (state === "visiting") throw new Error(`순환 import는 정적 번들에서 지원하지 않습니다: ${module.fileName}`);
  visitState.set(module.fileName, "visiting");
  module.dependencies.forEach(visit);
  visitState.set(module.fileName, "done");
  if (module.fileName !== entry) sortedModules.push(module);
}
visit(entryModule);
const moduleIds = new Map(sortedModules.map(module => [module.fileName, `__withTrip_${module.fileName.replace(/\.js$/, "").replace(/[^A-Za-z0-9_$]/g, "_")}`]));
const output = ["// Generated by scripts/build-app-bundle.mjs. Edit source modules instead.", "(() => {"];
for (const module of [...sortedModules, entryModule]) {
  const id = moduleIds.get(module.fileName);
  const bindings = module.imports.flatMap(imported => imported.bindings.map(binding => {
    const dependency = moduleIds.get(imported.dependency);
    if (!dependency) throw new Error(`모듈 의존성을 찾을 수 없습니다: ${imported.dependency} (${module.fileName})`);
    const record = moduleCache.get(imported.dependency);
    if (binding.imported === "*") return `const ${binding.local} = ${dependency};`;
    if (!record.exports.some(item => item.exported === binding.imported)) throw new Error(`'${binding.imported}' export를 ${imported.dependency}에서 찾을 수 없습니다 (${module.fileName})`);
    return `const ${binding.local} = ${dependency}[${JSON.stringify(binding.imported)}];`;
  }));
  const exportedObject = module.exports.map(item => `${JSON.stringify(item.exported)}: ${item.local}`).join(", ");
  const body = [
    `${module.fileName === entry ? "" : `const ${id} = `}(function () {`,
    ...bindings,
    module.source,
    module.fileName === entry ? "})();" : `return Object.freeze({ ${exportedObject} });\n})();`
  ].join("\n");
  output.push(body);
}
output.push("})();", "");
const bundle = output.join("\n");
if (/^\s*(?:import|export)\s/m.test(bundle)) throw new Error("생성 번들에 import/export 문이 남아 있습니다.");
new Function(bundle);
await writeFile(join(root, "js", "app.bundle.js"), bundle, "utf8");
console.log(`Bundled ${sortedModules.length + 1} isolated modules into js/app.bundle.js`);
