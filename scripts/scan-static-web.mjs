import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';
import { parse } from 'acorn';
import { parse as parseHtml } from 'parse5';
import ignoredDirectories from './static-scan-scope.json' with { type: 'json' };

const excluded = new Set(ignoredDirectories);
const configurationNames = new Set(['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']);
const fixedPath = /^(?:\/(?!\/)|\\|[a-z]:[\\/]|file:\/\/\/)/i;

function* htmlElements(node) {
  if (node.tagName && node.sourceCodeLocation?.startTag) yield node;
  for (const child of node.childNodes ?? []) yield* htmlElements(child);
  if (node.content) yield* htmlElements(node.content);
}

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$|\.$/g, '');
  if (/^(?:localhost|.*\.localhost|.*\.local)$/.test(host)) return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (isIP(host) === 6) {
    const mapped = /^::ffff:([\da-f]{1,4}):([\da-f]{1,4})$/.exec(host);
    if (mapped) {
      const [upper, lower] = mapped.slice(1).map(part => Number.parseInt(part, 16));
      return isPrivateHost([upper >> 8, upper & 255, lower >> 8, lower & 255].join('.'));
    }
    return host === '::' || host === '::1' || /^(?:f[cd]|fe[89ab]|ff)/.test(host);
  }
  return false;
}

function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === 'object') visit(value, callback);
  }
}

function propertyName(node) {
  return node?.type === 'MemberExpression' ? (node.computed ? node.property.value : node.property.name) : null;
}

function literalString(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const a = literalString(node.left), b = literalString(node.right);
    if (a !== null && b !== null) return a + b;
  }
  return null;
}

function sanitized(node) {
  if (node.type !== 'CallExpression') return false;
  return (node.callee.type === 'Identifier' && ['sanitizeHtml', 'filterXSS'].includes(node.callee.name)) ||
    (propertyName(node.callee) === 'sanitize' && node.callee.object.name === 'DOMPurify');
}

function riskyScriptSource(value) {
  try {
    const url = new URL(value.startsWith('//') ? `https:${value}` : value);
    return url.protocol !== 'https:' || url.username || url.password || !url.hostname || isPrivateHost(url.hostname);
  } catch {
    return true;
  }
}

const executableData = /data:\s*(?:text\/html|image\/svg\+xml|(?:text|application)\/(?:x-)?(?:java|ecma)script)/i;

export function scanStaticWeb(directory) {
  const root = path.resolve(directory);
  const files = [], findings = [], omitted = [];
  const add = (file, line, rule, risk, evidence, reason, remediation) => {
    findings.push({ file, line, rule, risk, evidence: evidence.replace(/\s+/g, ' ').slice(0, 240), reason, remediation });
  };
  function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch (error) { add(path.relative(root, current) || '.', null, '目录不可读', 'Review', error.message, '无法检查目录中的文件。', '修正目录权限后重扫。'); return; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      const relative = path.relative(root, full).split(path.sep).join('/');
      if (entry.isDirectory() && excluded.has(entry.name)) { omitted.push(relative); continue; }
      if (/[\u4e00-\u9fff]/.test(entry.name)) {
        add(relative, null, '中文路径', 'Medium', relative, '路径组件包含中文字符。', '改为 ASCII 名称并同步引用。');
      }
      if (entry.isSymbolicLink()) {
        add(relative, null, '包外链接', 'High', relative, '交付目录包含符号链接。', '使用包内普通文件。');
      } else if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push({ full, relative });
    }
  }
  walk(root);
  let htmlFiles = 0, configFiles = 0, htmlAssignments = 0, sanitizedAssignments = 0;
  for (const { full, relative } of files) {
    if (/\.(?:php|jsp|aspx|ejs|hbs|jinja2?)$/i.test(relative) || /^(?:server\.[cm]?js|app\.py|main\.go)$/i.test(path.basename(relative))) {
      add(relative, null, '非静态 Web 交付', 'High', relative, '包内包含服务端入口或模板。', '交付静态 HTML、脚本与素材，移出服务端依赖。');
    }
    const html = /\.html?$/i.test(relative);
    const config = configurationNames.has(path.basename(relative));
    if (!html && !config) continue;
    if (html) htmlFiles++;
    if (config) configFiles++;
    let source;
    try { source = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(full)); }
    catch (error) { add(relative, null, '文件不可读', 'Review', error.message, '无法按 UTF-8 完整读取。', '修正编码或文件权限后重扫。'); continue; }
    const lineAt = offset => source.slice(0, offset).split('\n').length;
    const report = (offset, rule, risk, evidence, reason, remediation) => add(relative, lineAt(offset), rule, risk, evidence, reason, remediation);
    if (config) {
      for (const match of source.matchAll(/\bbase\s*:\s*(['"])(\/[^'"]*)\1/gi)) {
        report(match.index, '构建配置固定基路径', 'High', match[0], '固定 Vite base 破坏任意子目录部署。', '使用 base: "./" 并重建。');
      }
      continue;
    }
    const elements = [...htmlElements(parseHtml(source, { sourceCodeLocationInfo: true, scriptingEnabled: false }))];
    for (const match of source.matchAll(/<(?:iframe|frame|object|embed)\b[^>]*>/gi)) {
      report(match.index, '危险嵌入内容标签', 'High', match[0], '页面包含浏览器嵌入执行上下文。', '使用普通 DOM 或静态图片。');
    }
    for (const { tagName: tag, attrs: rawAttrs, sourceCodeLocation: location } of elements) {
      const attrs = Object.fromEntries(rawAttrs.map(({ name, value }) => [name, value.trim()]));
      const start = location.startTag.startOffset;
      const markup = source.slice(start, location.startTag.endOffset);
      if (tag === 'meta' && attrs['http-equiv']?.toLowerCase() === 'refresh') {
        report(start, 'Meta Refresh 跳转', 'High', markup, '入口自动跳转。', '提供可点击的相对链接或直接提供游戏内容。');
      }
      for (const name of ['src', 'href', 'action', 'data', 'poster', 'srcset']) {
        const value = attrs[name];
        if (value === undefined) continue;
        if (['src', 'href', 'action', 'data'].includes(name) && /^\s*javascript:/i.test(value)) {
          report(start, 'JavaScript 协议引用', 'High', name + '=' + value, '属性值会执行脚本。', '改为相对链接与安全事件处理。');
        }
        if (fixedPath.test(value)) {
          report(start, '固定资源路径', 'High', name + '=' + value, '资源路径依赖站点根或本机目录。', '使用包内相对路径。');
        }
        if (['src', 'action'].includes(name) && /^\s*data:/i.test(value)) {
          const risk = name === 'action' || executableData.test(value) ? 'High' : 'Medium';
          report(start, '活跃源属性中的 Data URI', risk, name + '=' + value, '活跃源中直接嵌入 Data URI。', '使用包内经过校验的静态资源。');
        }
      }
      if (tag === 'script' && /^(?:https?:)?\/\//i.test(attrs.src ?? '') && riskyScriptSource(attrs.src)) {
        report(start, '外部脚本来源', 'High', attrs.src, '非 HTTPS、带认证信息、无效或本地/私网脚本来源。', '随包提供已固定版本的本地脚本。');
      }
    }
    for (const match of source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s'"()]+))\s*\)/gi)) {
      if (fixedPath.test(match[1] ?? match[2] ?? match[3])) report(match.index, '固定 CSS 资源路径', 'High', match[0], '样式依赖固定部署路径。', '使用包内相对路径。');
    }
    for (const { tagName, attrs: rawAttrs, sourceCodeLocation: location } of elements) {
      if (tagName !== 'script') continue;
      const attrs = Object.fromEntries(rawAttrs.map(({ name, value }) => [name, value.trim().toLowerCase()]));
      if (attrs.src || (attrs.type && !['module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'].includes(attrs.type))) continue;
      const offset = location.startTag.endOffset;
      const javascript = source.slice(offset, location.endTag?.startOffset ?? location.endOffset);
      let tree;
      try { tree = parse(javascript, { ecmaVersion: 'latest', sourceType: attrs.type === 'module' ? 'module' : 'script' }); }
      catch (error) { report(offset + (error.pos ?? 0), '内联脚本无法可靠解析', 'Review', error.message, '无法核完脚本中的 HTML 写入。', '修正语法后重扫。'); continue; }
      visit(tree, node => {
        const where = offset + node.start;
        const expression = () => javascript.slice(node.start, Math.min(node.end, node.start + 240));
        if (node.type === 'AssignmentExpression' && ['src', 'href', 'action', 'poster'].includes(propertyName(node.left))) {
          const value = literalString(node.right);
          if (value !== null && fixedPath.test(value)) {
            report(where, '脚本固定资源路径', 'High', expression(), '脚本设置固定资源路径。', '使用包内相对路径。');
          }
        }
        if (node.type === 'AssignmentExpression' && ['innerHTML', 'outerHTML'].includes(propertyName(node.left))) {
          htmlAssignments++;
          if (sanitized(node.right)) { sanitizedAssignments++; return; }
          const value = literalString(node.right);
          if (value === null) {
            report(where, '动态 HTML 写入', 'High', expression(), '动态值进入 HTML 解析器。', '写入前使用 DOMPurify.sanitize 或 sanitizeHtml，纯文本改用 textContent。');
          } else if (/<script\b|<(?:iframe|frame|object|embed)\b|\bon\w+\s*=|javascript:|http-equiv\s*=\s*["']?refresh/i.test(value)) {
            report(where, '危险静态 HTML 写入', 'High', expression(), 'HTML 字面量包含可执行内容。', '移除可执行标签、事件和协议。');
          } else if (/data:/i.test(value)) {
            report(where, '静态 HTML Data URI', executableData.test(value) ? 'High' : 'Medium', expression(), '写入的 HTML 包含 Data URI。', '使用经过校验的本地图片引用。');
          }
        }
        if (node.type === 'CallExpression' || node.type === 'NewExpression') {
          const method = propertyName(node.callee);
          if ((node.callee.type === 'Identifier' && node.callee.name === 'eval') ||
              (['write', 'writeln'].includes(method) && node.callee.object.name === 'document')) {
            const dynamic = node.arguments.some(argument => literalString(argument) === null);
            report(where, '高风险 JavaScript API', dynamic ? 'High' : 'Medium', expression(), '运行代码或写入文档。', '使用安全 DOM API。');
          }
          if (['fetch', 'Worker', 'URL'].includes(node.callee.name)) {
            const argument = node.arguments[0];
            if (argument?.type === 'Literal' && typeof argument.value === 'string' && fixedPath.test(argument.value)) {
              report(where, '脚本固定资源路径', 'High', expression(), '脚本从固定路径加载资源。', '使用相对资源路径。');
            }
          }
        }
        if (node.type === 'MemberExpression' && node.object.name === 'document' && propertyName(node) === 'cookie') {
          report(where, '高风险 JavaScript API', 'Medium', expression(), '脚本访问 cookie。', '核实是否必要并避免敏感信息进入前端。');
        }
      });
    }
  }
  const unique = [...new Map(findings.map(f => [[f.file, f.line, f.rule, f.evidence].join('|'), f])).values()];
  const order = { High: 0, Medium: 1, Review: 2 };
  unique.sort((a, b) => order[a.risk] - order[b.risk] || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
  const counts = Object.fromEntries(['High', 'Medium', 'Review'].map(risk => [risk, unique.filter(f => f.risk === risk).length]));
  return { root, htmlFiles, configFiles, files: files.length, omitted, htmlAssignments, sanitizedAssignments, counts, findings: unique, passed: unique.length === 0 };
}

export function scanMarkdown(result) {
  const conclusion = result.passed ? '通过。本次扫描未命中本技能定义的安全规则。'
    : result.counts.High || result.counts.Medium ? '需修复。' : '需人工复核。';
  const lines = ['# Web Zip 安全扫描报告', '', `扫描路径为 ${result.root}`, '', `扫描的 HTML 文件数为 ${result.htmlFiles}，Vite 配置文件数为 ${result.configFiles}。`, '',
    `问题统计共 ${result.findings.length} 项，其中高风险 ${result.counts.High} 项，中风险 ${result.counts.Medium} 项，需人工复核 ${result.counts.Review} 项。`, '', '## 总体结论', '', conclusion, ''];
  for (const [risk, label, prefix] of [['High', '高风险', 'H'], ['Medium', '中风险', 'M'], ['Review', '需人工复核', 'R']]) {
    lines.push('## ' + label, '');
    const rows = result.findings.filter(f => f.risk === risk);
    if (!rows.length) lines.push('无。', '');
    rows.forEach((f, index) => lines.push(`### ${prefix}-${index + 1} ${f.rule}`, '', `- 文件为 ${f.file}`, `- 行号为 ${f.line ?? 'N/A'}`, `- 证据为 \`${f.evidence.replaceAll('`', "'")}\``, `- 原因为${f.reason}`, `- 修复建议为${f.remediation}`, ''));
  }
  const rootName = path.basename(result.root);
  const boundary = excluded.has(rootName) ? `扫描根目录 ${rootName} 本身属于默认排除目录，因此本次纳入根目录。其下同名目录继续按默认规则排除。` : '本次未放宽默认排除范围。';
  lines.push('## 扫描边界', '', `检查了 ${result.files} 个文件的路径、HTML 原文和支持的构建配置。`, '', `排除目录为 ${[...excluded].join('、')}。${boundary}`, '',
    `HTML 写入共 ${result.htmlAssignments} 处，其中 ${result.sanitizedAssignments} 处直接调用认可的净化入口。`, '', '本次静态扫描未执行 HTML，也未请求外部脚本。结果不能证明不存在所有安全漏洞。', '');
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [target, output] = process.argv.slice(2);
  if (!target || process.argv.length > 4) {
    console.error('Usage: npm run scan:static -- <directory> [report-path-without-extension]');
    process.exit(2);
  }
  const result = scanStaticWeb(target);
  if (output) {
    fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    fs.writeFileSync(output + '.json', JSON.stringify(result, null, 2) + '\n');
    fs.writeFileSync(output + '.md', scanMarkdown(result));
  }
  console.log(JSON.stringify({ target: result.root, htmlFiles: result.htmlFiles, counts: result.counts, htmlAssignments: result.htmlAssignments, passed: result.passed }));
  process.exitCode = result.passed ? 0 : 1;
}
