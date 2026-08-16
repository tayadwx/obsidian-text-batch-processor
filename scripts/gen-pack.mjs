import { writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// 常用英文缩略语（约 350 个高频缩写/首字母词）。标题式大小写与单词首字母大写
// 都会把命中此集合的词保持全大写。可在导入后自行增删。
// ---------------------------------------------------------------------------
const ABBR = [
  'USA','UK','UAE','EU','UN','NATO','NASA','FBI','CIA','NSA','WHO','WTO','IMF',
  'OECD','OPEC','G7','G8','G20','BRICS','APEC','ASEAN','CNN','BBC','ABC','NBC',
  'CBS','ESPN','NBA','NFL','NHL','MLB','FIFA','UEFA','WWE','IOC','PGA','F1',
  'WTA','ATP','NCAA','MVP','GOAT','USB','CPU','GPU','RAM','ROM','SSD','HDD',
  'BIOS','OS','PC','MAC','APP','API','SDK','HTML','CSS','JS','TS','JSX','JSON',
  'XML','YAML','CSV','SQL','NoSQL','PDF','DOC','DOCX','PPT','PPTX','XLS','XLSX',
  'ZIP','RAR','PNG','JPG','JPEG','GIF','BMP','SVG','MP3','MP4','WAV','AVI','MKV',
  'MOV','FLAC','AAC','HTTP','HTTPS','FTP','SFTP','SSH','TCP','IP','UDP','DNS',
  'DHCP','URL','URI','WWW','LAN','WAN','WLAN','VPN','WIFI','GSM','CDMA','LTE',
  'IoT','AI','ML','DL','NLP','CV','OCR','TPU','NPU','UI','UX','QA','QC','CI',
  'CD','HR','IT','PR','MR','CEO','CFO','CTO','COO','CIO','CMO','VP','PM','PO',
  'BA','BSc','MSc','PhD','MD','MBA','JD','CPA','RN','DNA','RNA','HIV','AIDS',
  'COVID','SARS','MERS','FDA','CDC','NIH','EPA','SEC','IRS','FCC','FAA','IBM',
  'HP','DELL','INTEL','AMD','ARM','iOS','AWS','AZURE','GCP','HDMI','VGA','DVI',
  'SATA','PCI','PCIe','BT','BLE','RFID','NFC','POS','ATM','PIN','CVV','ID','VIP',
  'OK','TV','DVD','CD','GPS','GIS','LBS','CMS','CRM','ERP','SCM','PLM','BOM',
  'KPI','OKR','ROI','CTR','CPC','CPM','SEO','SEM','SMM','DAU','MAU','ARPU','LTV',
  'GMV','SKU','UPC','EAN','ISBN','ISSN','DOI','TOML','INI','ENV','LOG','SRC',
  'LIB','BIN','VAR','CONST','FUNC','ASYNC','AWAIT','NPM','YARN','PNPM','NODE',
  'DENO','BUN','PY','PIP','RUBY','GEM','CARGO','GO','JAVA','KOTLIN','SWIFT',
  'RUST','CPP','CXX','CS','VB','PHP','PERL','SHELL','BASH','ZSH','SH','PWSH',
  'CMD','PS1','MYSQL','POSTGRES','PG','SQLITE','MONGO','REDIS','DOCKER','K8S',
  'KUBE','HELM','TERRA','ANSIBLE','GIT','SVN','HG','JVM','JIT','GC','OOM','MEM',
  'DISK','IO','TTY','PID','UID','GID','SUDO','ROOT','ADMIN','PUBLIC','PRIVATE',
  'PROXY','VLAN','NAT','PAT','CIDR','IPv4','IPv6','BGP','OSPF','RIP','WS','WSS',
  'GRPC','REST','SOAP','RPC','JWT','OAUTH','SAML','OIDC','CSRF','XSS','SQLI',
  'DDoS','DOS','MITM','SSL','TLS','PGP','GPG','RSA','AES','DES','SHA','MD5',
  'HMAC','BASE64','UTF8','ASCII','UNICODE','MIME','SMTP','POP3','IMAP','TOR',
  'CDN','EDGE','LB','ALB','NLB','ELB','ECS','RDS','S3','OSS','COS','OBS','BLOB',
  'REGION','AZ','VPC','SG','AMI','EC2','FC','LAMBDA','CRUD','ACID','BASE','CAP',
  'ORM','ODBC','JDBC','JPA','SPRING','DJANGO','FLASK','FASTAPI','EXPRESS','NEST',
  'GIN','TF','TORCH','KERAS','ONNX','CUDA','SIMD','FPU','ALU','CU','ESLINT',
  'PRETTIER','JEST','VITEST','NEXT','NUXT','REMIX','SVELTE','VUE','REACT',
  'ANGULAR','SOLID','DRY','KISS','YAGNI','MVC','MVVM','DOM','AST','LSP','IDE',
  'CLI','GUI','TUI','REPL','SASS','LESS','WEBPACK','VITE','ROLLUP','ESBUILD',
  'BABEL','TSC','CYPRESS','PLAYWRIGHT','MOCA'
];

function abbrSetSrc() {
  return 'const ABBR = new Set(' + JSON.stringify(ABBR.map(x => x.toUpperCase())) + ');';
}

// ---- 英文：转小写 / 转大写 ----
const lowerCode = 'return text.toLowerCase();';
const upperCode = 'return text.toUpperCase();';

// ---- 英文：标题式大小写（保留缩略语全大写，虚词小写） ----
const titleCode = abbrSetSrc() + `
function titleCase(t) {
  const small = new Set(['a','an','the','and','but','or','for','nor','so','yet','on','at','to','by','in','of','as','with','from','into','onto','upon','off','out','up','down','about','over','after','before','between','through','during','within','without','against','among','per','via','vs','etc']);
  const parts = t.toLowerCase().split(/(\\s+)/);
  let last = -1;
  for (let i = 0; i < parts.length; i++) { if (!/^\\s+$/.test(parts[i])) last = i; }
  for (let i = 0; i < parts.length; i++) {
    const w = parts[i];
    if (/^\\s+$/.test(w) || w === '') continue;
    const up = w.toUpperCase();
    if (ABBR.has(up)) { parts[i] = up; continue; }
    if (i === 0 || i === last) { parts[i] = w.charAt(0).toUpperCase() + w.slice(1); }
    else if (small.has(w)) { parts[i] = w; }
    else { parts[i] = w.charAt(0).toUpperCase() + w.slice(1); }
  }
  return parts.join('');
}
return titleCase(text);`;

// ---- 英文：单词首字母大写（保留缩略语全大写） ----
const startCode = abbrSetSrc() + `
function startCase(t) {
  const parts = t.toLowerCase().split(/(\\s+)/);
  for (let i = 0; i < parts.length; i++) {
    const w = parts[i];
    if (/^\\s+$/.test(w) || w === '') continue;
    const up = w.toUpperCase();
    if (ABBR.has(up)) { parts[i] = up; continue; }
    parts[i] = w.charAt(0).toUpperCase() + w.slice(1);
  }
  return parts.join('');
}
return startCase(text);`;

// ---- Markdown 列表修正：连在一起/未正确换行的有序与无序列表拆成标准列表 ----
const listCode = `function fmtList(t) {
  let s = t.replace(/\\r\\n?/g, '\\n');
  s = s.replace(/([^\\n])([ \\t]*)((?:\\d+[.)]|[-*+])[ \\t]+)/g, function(m, before, ws, marker) {
    return before + '\\n' + ws + marker;
  });
  const lines = s.split('\\n');
  const out = [];
  for (let line of lines) {
    const x = line.trim();
    if (x === '') { out.push(''); continue; }
    const om = x.match(/^(\\d+)[.)][ \\t]+(.*)$/);
    const um = x.match(/^([-*+])[ \\t]+(.*)$/);
    if (om) { out.push(om[1] + '. ' + om[2].trim()); }
    else if (um) { out.push('- ' + um[2].trim()); }
    else { out.push(x); }
  }
  return out.join('\\n');
}
return fmtList(text);`;

// ---- 注释+代码格式化：# 误标题转引用；CLI 命令行包成代码块 ----
const cliCode = `const CLI = /^(?:cd|ls|pwd|mkdir|rm|cp|mv|git|npm|yarn|pnpm|npx|python|python3|pip|pip3|node|brew|sudo|chmod|chown|cat|echo|curl|wget|ssh|scp|tar|unzip|grep|find|docker|kubectl|code|vim|nano|clear|export|source|apt|apt-get|yum|dnf|pacman|make|gcc|g\\+\\+|go|java|javac|ruby|php|composer|nginx|systemctl|service|ping|telnet|netstat|ifconfig|ps|kill|top|htop|tmux|screen|rsync|sed|awk|tail|head|less|more|touch|ln|df|du|free|uname|whoami|which|whereis|watch|date|sh|bash|zsh|cmd|powershell|cls|dir|copy|move|del|type|set|call|gradle|mvn|cargo|rustc|conda|pytest|jest|tsc|webpack|vite|helm|terraform|ansible|az|gcloud|aws|docker-compose)\\b/;
const FENCE = String.fromCharCode(96, 96, 96);
let lines = text.replace(/\\r\\n?/g, '\\n').split('\\n');
lines = lines.map(function(l) {
  const m = l.match(/^#\\s+(?!#)(.*)$/);
  return m ? '> ' + m[1] : l;
});
const out = [];
let i = 0;
while (i < lines.length) {
  if (CLI.test(lines[i].trim())) {
    const block = [];
    while (i < lines.length && CLI.test(lines[i].trim())) { block.push(lines[i].trim()); i++; }
    out.push(FENCE);
    out.push(block.join('\\n'));
    out.push(FENCE);
  } else { out.push(lines[i]); i++; }
}
return out.join('\\n');`;

// ---- 去除 Markdown 样式标记（加粗/斜体/删除线/高亮/行内代码/链接） ----
const plainCode = `function plain(t) {
  const BT = String.fromCharCode(96);
  let s = t;
  s = s.replace(/!\\[([^\\]]*)\\]\\([^)]*\\)/g, '$1');
  s = s.replace(/\\[([^\\]]*)\\]\\([^)]*\\)/g, '$1');
  s = s.replace(/\\*\\*([^*]+)\\*\\*/g, '$1').replace(/__([^_]+)__/g, '$1');
  s = s.replace(/\\*([^*]+)\\*/g, '$1').replace(/_([^_]+)_/g, '$1');
  s = s.replace(/~~([^~]+)~~/g, '$1');
  s = s.replace(/==([^=]+)==/g, '$1');
  s = s.replace(new RegExp(BT + '([^' + BT + ']+)' + BT, 'g'), '$1');
  return s;
}
return plain(text);`;

// ---- 压缩多余空行：仅含不可见字符的连续空行合并为单个换行 ----
const squeezeCode = `function squeeze(t) {
  let lines = t.replace(/\\r\\n?/g, '\\n').split('\\n');
  const out = [];
  let blank = false;
  const isBlank = function(l) { return /^[\\s\\u00A0\\u3000\\u200B\\u200C\\u200D\\uFEFF]*$/.test(l); };
  for (let l of lines) {
    if (isBlank(l)) { if (!blank) { out.push(''); blank = true; } }
    else { out.push(l); blank = false; }
  }
  return out.join('\\n');
}
return squeeze(text);`;

// ---- Callout（固定类型） ----
function calloutCode(type) {
  return `const body = text.split('\\n').map(function(l){ return '> ' + l; }).join('\\n');
return '> [!' + '${type}' + ']\\n' + body;`;
}

// ---- Callout（弹窗选择类型，使用 prompt，受插件纯函数模型限制） ----
const calloutPromptCode = `const types = ['note','abstract','info','todo','tip','success','question','warning','failure','danger','bug','example','quote'];
let t = (typeof prompt !== 'undefined') ? prompt('Callout 类型 (' + types.join('/') + ')', 'note') : 'note';
if (!t || types.indexOf(t) < 0) t = 'note';
const body = text.split('\\n').map(function(l){ return '> ' + l; }).join('\\n');
return '> [!' + t + ']\\n' + body;`;

const CALLOUT_TYPES = ['note','abstract','info','todo','tip','success','question','warning','failure','danger','bug','example','quote'];

const actions = [
  { name: '英文转小写', code: lowerCode, category: '英文处理', favorite: false },
  { name: '英文转大写', code: upperCode, category: '英文处理', favorite: false },
  { name: '英文标题式大小写', code: titleCode, category: '英文处理', favorite: true },
  { name: '英文单词首字母大写', code: startCode, category: '英文处理', favorite: true },
  { name: 'Markdown列表修正', code: listCode, category: 'Markdown列表', favorite: true },
  { name: '注释与代码格式化', code: cliCode, category: '注释代码', favorite: true },
  { name: '去除Markdown样式标记', code: plainCode, category: 'Markdown格式化', favorite: false },
  { name: '压缩多余空行', code: squeezeCode, category: 'Markdown格式化', favorite: false },
  ...CALLOUT_TYPES.map(t => ({ name: 'Callout-' + t, code: calloutCode(t), category: 'Callout', favorite: false })),
  { name: 'Callout-弹窗选择', code: calloutPromptCode, category: 'Callout', favorite: false }
];

const sequences = [
  {
    name: 'Markdown快速格式化',
    category: 'Markdown格式化',
    favorite: true,
    steps: [
      { actionName: '去除Markdown样式标记' },
      { actionName: '压缩多余空行' }
    ]
  },
  {
    name: '文本清理流水线',
    category: 'Markdown格式化',
    favorite: false,
    steps: [
      { actionName: 'Markdown列表修正' },
      { actionName: '去除Markdown样式标记' },
      { actionName: '压缩多余空行' }
    ]
  },
  {
    name: 'Callout-快速引用',
    category: 'Callout',
    favorite: false,
    steps: [ { actionName: 'Callout-note' } ]
  }
];

const pack = {
  $schema: 'text-batch-processor-pack',
  version: 1,
  actions,
  sequences
};

// ---- 语法校验：每个动作的 code 必须能被 new Function('text', code) 编译 ----
let failed = 0;
for (const a of actions) {
  try {
    // eslint-disable-next-line no-new
    new Function('text', a.code);
  } catch (e) {
    failed++;
    console.error('语法错误 @ 动作 [' + a.name + ']: ' + e.message);
  }
}

if (failed > 0) {
  console.error('存在 ' + failed + ' 个语法错误，已终止写入。');
  process.exit(1);
}

const outPath = '/Users/zhanghccn/Workbuddy/Obsidian文本批处理插件/starter/custom-pack.json';
writeFileSync(outPath, JSON.stringify(pack, null, 2), 'utf8');
console.log('OK: 已生成 ' + outPath);
console.log('动作数=' + actions.length + ' 序列数=' + sequences.length);
