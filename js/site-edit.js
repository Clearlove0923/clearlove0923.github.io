/* ===========================================================================
 * 站点文案：三层来源 + 管理员就地编辑（全站共用一份）
 * ---------------------------------------------------------------------------
 * 被所有正文页面引用：index / features / tutorial / docs / about / docs/learning-guide
 *
 * 文案优先级（低 → 高）：
 *   ① HTML 里写死的文字          —— 关掉 JS 也能看，最终兜底
 *   ② 仓库根目录 content.json    —— 管理员「导出文案」后放进项目并推送
 *   ③ 云端 KV（/api/site）       —— 「保存并发布」写的那份，线上实时生效
 *
 * 管理员：页头右上角「管理员」→ 输口令 → 就地改字 → 保存并发布。
 *   登录态写在 localStorage['mdm.adminHash']，所以在站内换页面**不用重新登录**；
 *   要退出登录就点工具条上的「锁定」。
 *   维护台（examples/md-maintain.html）读的是 sessionStorage 里的同一个键，
 *   这里两边都写一份，互不影响。
 *
 * 哪些文字可改？
 *   · 页面自己写了 data-edit="key" 的（首页）：只认这些标记，不去猜。
 *   · 没写标记的页面：脚本自动给正文里的 h1/h2/h3/p/li/td 分配 key，形如
 *       p.<页面>.<区块>.<标签><序号>      例如 p.features.unify.p2
 *     页头页脚、导航、目录、代码块一律跳过；二游官网抽屉是站外链接，不参与。
 *     自动 key 依赖元素顺序，所以在正文中间插一段新文字，会让它后面同标签的
 *     序号整体后移；那时重新编辑一遍，或点「恢复默认文案」即可。
 *
 * 段落里带内联格式（<strong>/<code>/<a> 等）时自动按富文本处理（保留标签），
 * 其余按纯文本处理 —— 云端来的内容永远不会被当成 HTML 执行。
 * ========================================================================= */
(function () {
  'use strict';

  var DEFAULT_API = 'https://solitary-glitter-af03.m13618472002.workers.dev';
  /* 与维护台共用同一组键：在维护台「云端设置」里改过地址，这里自动跟着走 */
  var KEY_API = 'mdm.apiBase';
  var KEY_ADMIN = 'mdm.adminHash';
  var KEY_CACHE = 'mdm.siteContent';

  /* ---------- 存取小工具（都包了 try：隐私模式下 localStorage 会直接抛错） ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function ssDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  /* ---------- 当前页面名：只取文件名，保证本地 file:// 打开时 key 也一样 ---------- */
  var PAGE = (function () {
    var seg = location.pathname.split('/').pop() || '';
    return (seg.replace(/\.html?$/i, '') || 'index').toLowerCase();
  })();

  /* ---------- 收集可编辑节点 ---------- */
  // 页头页脚、导航、目录、代码块、抽屉这些地方不参与自动标注
  var HARD = 'header,footer,nav,.toc,.edit-bar,.no-edit,[data-edit-skip],script,style,pre,code,textarea,button,.site-header,.site-footer,.side-dock,.dock-panel';

  // 找这个元素属于哪个「区块」：优先用最近的带 id 的祖先/前置兄弟，
  // 都没有就靠调用方按「第几个标题」来分段
  function idBlockOf(el) {
    var node = el, guard = 0;
    while (node && node !== document.body && guard++ < 60) {
      if (node.id) return node.id;
      var prev = node.previousElementSibling;
      while (prev) {
        if (prev.id) return prev.id;
        prev = prev.previousElementSibling;
      }
      var parent = node.parentElement;
      if (!parent || parent.tagName === 'MAIN' || parent.tagName === 'BODY') return '';
      node = parent;
    }
    return '';
  }

  function collectNodes() {
    var explicit = Array.prototype.slice.call(document.querySelectorAll('[data-edit]'));
    if (explicit.length) return explicit;   // 页面自己标好了，就完全按它的来

    // 子页面没有 data-edit，这里自动认领正文里的文字块。
    // 范围是整个 body，靠 HARD 把页头页脚、导航、目录、代码块这些挑出去。
    var scope = document.body;
    var cands = Array.prototype.slice.call(scope.querySelectorAll('h1,h2,h3,p,li,td,th'));
    var out = [], counts = {}, cur = 'top', hCount = 0, auto = 0;

    cands.forEach(function (el) {
      if (el.closest(HARD)) return;                  // 页头页脚目录等免打扰
      if (el.querySelector('ul,ol,table')) return;   // 外层容器交给里面的条目，免得文字重复
      if (!norm(el.textContent)) return;             // 空段落不标

      var bid = idBlockOf(el);
      if (bid) { cur = bid; hCount = 0; }
      else if (/^H[1-3]$/.test(el.tagName)) { hCount++; cur = 's' + hCount; }   // 没有 id 的标题自己起一段

      var tag = el.tagName.toLowerCase();
      var slot = cur + '|' + tag;
      counts[slot] = (counts[slot] || 0) + 1;
      var n = counts[slot];
      var key = 'p.' + PAGE + '.' + cur + '.' + tag + (n > 1 ? '-' + n : '');

      el.setAttribute('data-edit', key);
      out.push(el);
      auto++;
    });

    if (auto && window.console && console.info) {
      console.info('[site-edit] 本页自动标注了 ' + auto + ' 处文案（' + PAGE + '）');
    }
    return out;
  }

  var nodes = collectNodes();
  if (!nodes.length) return;   // 没有可编辑内容就不注入任何东西（404、示例页等）

  /* ---------- 元素读写 ---------- */
  function keyOf(el) { return el.getAttribute('data-edit'); }
  function isHl(el) { return el.hasAttribute('data-edit-hl'); }
  function isRich(el) {
    if (isHl(el)) return false;                                    // 首页大标题走 { } 高亮规则
    if (el.hasAttribute('data-edit-rich')) return true;
    if (el.hasAttribute('data-edit-plain')) return false;
    return /<(a|strong|b|em|i|code|br|small)\b/i.test(el.innerHTML);
  }

  // 富文本白名单：只留几个行内标签，属性只留 a[href]（javascript: 一律砍掉）。
  // 白名单以外的标签分两种处理：脚本/样式类直接整块丢掉，其余（如 div、span 的亲戚）
  // 保留文字、去掉标签 —— 免得管理员误粘一段 HTML 把页面结构带歪。
  var DROP_TAG = /^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|TEMPLATE|NOSCRIPT|FORM|INPUT|BUTTON)$/;

  function sanitize(html) {
    var box = document.createElement('div');
    box.innerHTML = String(html);
    (function clean(root) {
      Array.prototype.slice.call(root.children).forEach(function (el) {
        if (DROP_TAG.test(el.tagName)) { el.remove(); return; }
        if (!/^(A|STRONG|B|EM|I|CODE|BR|SMALL|SPAN)$/.test(el.tagName)) {
          el.parentNode.replaceChild(document.createTextNode(el.textContent), el);
          return;
        }
        var href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';
        Array.prototype.slice.call(el.attributes).forEach(function (a) { el.removeAttribute(a.name); });
        if (href && !/^\s*javascript:/i.test(href)) el.setAttribute('href', href);
        clean(el);
      });
    })(box);
    return box.innerHTML;
  }

  function valueOf(el) {
    return isRich(el) ? sanitize(el.innerHTML).trim() : norm(el.textContent);
  }

  /* ---------- 状态 ---------- */
  var content = {};      // 三层合成后当前生效的文案
  var baked = {};        // ② content.json
  var cloud = null;      // ③ 云端 KV；null = 云端没内容（此时不覆盖 baked）
  var originals = {};    // ① HTML 内置文案
  var snapshot = {};     // 进编辑模式前的 DOM
  var beforeText = [];
  var adminHash = lsGet(KEY_ADMIN) || ssGet(KEY_ADMIN) || '';
  var editing = false;
  var busy = false;

  nodes.forEach(function (el) { originals[keyOf(el)] = el.innerHTML; });

  /* ---------- 注入界面：页头「管理员」+ 底部工具条 ---------- */
  function ensureToggle() {
    var btn = document.getElementById('editToggleBtn');
    if (btn) return btn;
    var host = document.querySelector('.header-actions');
    if (!host) return null;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'editToggleBtn';
    btn.className = 'btn btn-edit';
    btn.textContent = '管理员';
    btn.title = '管理员入口：输入口令后可直接修改本页文字';
    host.appendChild(btn);
    return btn;
  }

  function ensureBar() {
    var bar = document.getElementById('editBar');
    if (bar) return bar;
    bar = document.createElement('section');
    bar.id = 'editBar';
    bar.className = 'edit-bar';
    bar.hidden = true;
    bar.innerHTML =
      '<div class="container edit-bar-inner">' +
        '<div class="edit-bar-lead">' +
          '<b>编辑中</b>' +
          '<span>点页面上任意文字即可直接改</span>' +
          '<span class="edit-bar-state" id="editState"></span>' +
        '</div>' +
        '<div class="edit-bar-actions">' +
          '<button class="btn btn-primary btn-sm" id="editSaveBtn" type="button">保存并发布</button>' +
          '<button class="btn btn-outline btn-sm" id="editExportBtn" type="button">导出文案</button>' +
          '<button class="btn btn-outline btn-sm" id="editResetBtn" type="button">恢复默认文案</button>' +
          '<button class="btn btn-ghost btn-sm" id="editLockBtn" type="button" title="退出管理员登录（全站一起退出）">锁定</button>' +
          '<button class="btn btn-ghost btn-sm" id="editExitBtn" type="button">退出编辑</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bar);
    return bar;
  }

  var toggleBtn = ensureToggle();
  // 页头没有 .header-actions 的页面（例如 examples/ 下的独立演示页）不是站点正文，
  // 不给它塞编辑入口，免得留一条点了没反应的按钮在页面上。
  if (!toggleBtn) return;

  var bar = ensureBar();
  var barState = document.getElementById('editState');

  function paintToggle() {
    if (!toggleBtn) return;
    toggleBtn.classList.toggle('is-admin', !!adminHash);
    toggleBtn.title = adminHash
      ? '已登录管理员：点一下直接编辑本页文字'
      : '管理员入口：输入口令后可直接修改本页文字';
  }
  paintToggle();

  /* ---------- 基础输出 ---------- */
  function setState(text, cls) {
    if (!barState) return;
    barState.textContent = text || '';
    barState.className = 'edit-bar-state' + (cls ? ' ' + cls : '');
  }

  var toastTimer = 0;
  function toast(msg) {
    var t = document.getElementById('editToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'editToast';
      t.className = 'edit-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2800);
  }

  function apiBase() {
    var v = lsGet(KEY_API);
    if (v === null || v === undefined) return DEFAULT_API;   // 没改过设置 → 用默认云端
    return String(v).trim().replace(/\/+$/, '');             // 维护台里清空 = 只用本机
  }

  /* ---------- 文案渲染 ---------- */
  function render(el, value) {
    if (isHl(el)) {
      // 首页大标题：{关键词} 渲染成 <em class="hl">关键词</em>，其余按纯文本写
      el.innerHTML = esc(value).replace(/\{([^{}]*)\}/g, '<em class="hl">$1</em>');
    } else if (isRich(el)) {
      el.innerHTML = sanitize(value);
    } else {
      el.textContent = value;
    }
  }

  // 三层合成：baked（仓库固化）打底，cloud（云端）覆盖在上面
  function effective() {
    var out = {}, k;
    for (k in baked) { if (has(baked, k)) out[k] = baked[k]; }
    if (cloud) { for (k in cloud) { if (has(cloud, k)) out[k] = cloud[k]; } }
    return out;
  }

  function apply() {
    if (editing) return;
    nodes.forEach(function (el) {
      var k = keyOf(el);
      if (has(content, k) && typeof content[k] === 'string') {
        render(el, content[k]);
      } else if (has(originals, k)) {
        el.innerHTML = originals[k];   // 三层都没有 → 回到 HTML 内置文案
      }
    });
  }

  // ② 读仓库根目录的 content.json。
  // 放在子目录里的页面（docs/learning-guide.html）要往上退到根目录，
  // 否则会去请求 /docs/content.json 白跑一趟。
  function bakedUrl() {
    var segs = location.pathname.split('/').filter(Boolean);
    var last = segs[segs.length - 1] || '';
    var depth = segs.length - (/\.[a-z0-9]+$/i.test(last) ? 1 : 0);   // 末段是文件名则不算目录
    return new Array(depth + 1).join('../') + 'content.json?ts=' + Date.now();
  }

  function loadBaked() {
    return fetch(bakedUrl(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || typeof j !== 'object') return;
        var c = (j.content && typeof j.content === 'object') ? j.content : j;
        if (!c || typeof c !== 'object') return;
        var next = {};
        for (var k in c) {
          if (has(c, k) && typeof c[k] === 'string') next[k] = c[k];
        }
        if (!Object.keys(next).length) return;
        baked = next;
        content = effective();
        apply();
      })
      .catch(function () { /* 没有该文件 / 读取失败 → 用 HTML 内置文案 */ });
  }

  // 高亮元素转成「{ }」纯文本形式，方便在 contenteditable 里直接编辑
  function toBraceForm() {
    nodes.forEach(function (el) {
      if (!isHl(el)) return;
      el.textContent = norm(
        el.innerHTML
          .replace(/<em class="hl">([\s\S]*?)<\/em>/gi, '{$1}')
          .replace(/<[^>]*>/g, '')
      );
    });
  }

  function collect() {
    var out = {};
    nodes.forEach(function (el) { out[keyOf(el)] = valueOf(el); });
    return out;
  }

  function isDirty() {
    for (var i = 0; i < nodes.length; i++) {
      if (valueOf(nodes[i]) !== beforeText[i]) return true;
    }
    return false;
  }

  /* ---------- 编辑模式 ---------- */
  function noEnter(e) {
    if (e.key === 'Enter') e.preventDefault();
  }

  function enterEdit() {
    if (editing) return;
    snapshot = {};
    nodes.forEach(function (el) { snapshot[keyOf(el)] = el.innerHTML; });

    toBraceForm();
    beforeText = nodes.map(valueOf);

    nodes.forEach(function (el) {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');
      el.classList.add('is-editable');
      // 单段文案：回车只会把结构搞乱，直接拦掉
      el.addEventListener('keydown', noEnter);
    });

    editing = true;
    document.body.classList.add('is-editing');
    bar.hidden = false;
    setState(apiBase() ? '改完点「保存并发布」' : '本机模式：没有配置云端，保存不了');
  }

  function exitEdit() {
    if (!editing) return;
    editing = false;
    nodes.forEach(function (el) {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
      el.classList.remove('is-editable');
      el.removeEventListener('keydown', noEnter);
      if (has(snapshot, keyOf(el))) el.innerHTML = snapshot[keyOf(el)];
    });
    document.body.classList.remove('is-editing');
    bar.hidden = true;
  }

  // 编辑模式下别让链接跳走：点文字只落光标
  document.addEventListener('click', function (e) {
    if (!editing) return;
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (a) e.preventDefault();
  }, true);

  /* ---------- 口令与云端 ---------- */
  function rememberAdmin(hex) {
    adminHash = hex || '';
    if (adminHash) {                   // 双写：正文页读 localStorage，维护台读 sessionStorage
      lsSet(KEY_ADMIN, adminHash);
      ssSet(KEY_ADMIN, adminHash);
    } else {
      lsDel(KEY_ADMIN);
      ssDel(KEY_ADMIN);
    }
    paintToggle();
  }

  function sha256hex(str) {
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) {
      return Promise.reject(new Error('当前环境不支持口令校验，请用 https 打开'));
    }
    var buf = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', buf).then(function (d) {
      return Array.prototype.map.call(new Uint8Array(d), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }

  function verifyHash(hex) {
    var base = apiBase();
    if (!base) return Promise.resolve(true);   // 本机模式：本地放行
    return fetch(base + '/api/verify', { headers: { 'X-Admin-Hash': hex }, cache: 'no-store' })
      .then(function (r) { return r.status !== 401; })   // 旧版 Worker 没有该接口时先放行，保存时会再校验
      .catch(function () { return true; });
  }

  // 云端那份文案是**整份覆盖**写入的，所以保存前必须先把云端现有内容拿到手，
  // 否则在别的页面（或另一个标签页）已经发布的文案会被这次保存抹掉。
  var cloudReady = false;

  function pull() {
    var base = apiBase();
    if (!base) return Promise.resolve(false);
    return fetch(base + '/api/site', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        // 云端不通 / Worker 还是旧版（没有该接口）→ j 为 null，此时什么都不动，
        // 保留 content.json 与本机缓存，免得访客突然看到出厂文字。
        if (!j) return false;
        var c = (j.content && typeof j.content === 'object') ? j.content : null;
        // 云端**明确**返回空（管理员点过「恢复默认」）→ cloud 归零，让 content.json / HTML 内置文案生效
        cloud = (c && Object.keys(c).length) ? c : null;
        cloudReady = true;
        lsSet(KEY_CACHE, JSON.stringify(cloud || {}));
        // 正在编辑时只更新数据、不碰页面 —— 别把管理员正在改的那段字刷掉
        if (!editing) { content = effective(); apply(); }
        return true;
      })
      .catch(function () { return false; });
  }

  function putCloud(next, onOk) {
    fetch(apiBase() + '/api/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Hash': adminHash },
      body: JSON.stringify({ content: next })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { status: r.status, ok: r.ok, body: j, next: next };
      });
    }).then(handlePutResult(onOk)).catch(function () {
      busy = false;
      setState('连不上云端，没有保存', 'warn');
      toast('连不上云端，这次改动没有保存（内容仍留在页面上）');
    });
  }

  function handlePutResult(onOk) {
    return function (res) {
      busy = false;
      if (res.status === 401) {
        rememberAdmin('');
        exitEdit();
        toast('口令不正确，云端拒绝了这次保存');
        return;
      }
      if (res.status === 404 || res.status === 405) {
        setState('云端还没有 /api/site 接口', 'warn');
        toast('Worker 还是旧版：请按说明重新部署一次 Worker');
        return;
      }
      if (!res.ok) {
        var msg = (res.body && res.body.error) || '未知错误';
        setState('保存失败：' + msg, 'warn');
        toast('保存失败：' + msg);
        return;
      }
      if (onOk) onOk(res.next);
    };
  }

  function save() {
    if (busy) return;
    var base = apiBase();
    if (!base) { setState('本机模式：没有配置云端，无法发布', 'warn'); toast('没有配置云端地址，保存不了'); return; }
    if (!adminHash) { setState('请先解锁管理员', 'warn'); return; }

    // 还没把云端那份全量文案读到手上就先读一次：
    // 否则这次 PUT 会把别的页面（以及另一个标签页）已经发布的文案整份抹掉。
    if (!cloudReady) {
      busy = true;
      setState('正在读取云端文案…', 'warn');
      pull().then(function (ok) {
        busy = false;
        if (!ok) {
          setState('读不到云端，这次没有保存', 'warn');
          toast('读不到云端最新文案，为免覆盖其它页面，这次没有保存');
          return;
        }
        doSave();
      });
      return;
    }
    doSave();
  }

  function doSave() {
    if (busy) return;
    // 云端是整份覆盖写入的，所以这里叠三层：
    //   底 = 云端最新 + 仓库固化（content.json）→ 别的页面的文案都在这一层
    //   中 = 进编辑模式时页面上显示的文字 → 本页没动过的字段原样带回
    //   上 = 本页这次改动（collect）→ 覆盖上面两层
    var next = {}, k;
    var baseLayer = effective();
    for (k in baseLayer) { if (has(baseLayer, k)) next[k] = baseLayer[k]; }
    for (k in content) { if (has(content, k)) next[k] = content[k]; }
    var now = collect();
    for (k in now) { if (has(now, k)) next[k] = now[k]; }

    busy = true;
    setState('正在保存…', 'warn');
    putCloud(next, function (saved) {
      cloud = saved;
      cloudReady = true;
      content = effective();
      lsSet(KEY_CACHE, JSON.stringify(saved));
      exitEdit();
      apply();
      toast('已发布 ✓ 访客刷新页面即可看到');
    });
  }

  /* ---------- 按钮 ---------- */
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      if (editing) {
        if (isDirty() && !window.confirm('还有改动没有发布，确定退出编辑吗？')) return;
        exitEdit();
        return;
      }
      if (adminHash) { enterEdit(); toast('已进入编辑模式'); return; }
      var pwd = window.prompt('输入管理员口令（登录后在站内换页面不用再输）');
      if (!pwd) return;
      sha256hex(pwd).then(function (hex) {
        return verifyHash(hex).then(function (ok) {
          if (!ok) { window.alert('口令不正确'); return; }
          rememberAdmin(hex);
          enterEdit();
          toast('已进入编辑模式，点页面上的文字直接改');
        });
      }).catch(function (e) { window.alert(e.message || '解锁失败'); });
    });
  }

  var saveBtn = document.getElementById('editSaveBtn');
  if (saveBtn) saveBtn.addEventListener('click', save);

  /* 导出文案：把「页面上现在看到的文案」存成 content.json 下载下来。
     放进项目根目录并推送后，它就成为页面的第二层默认文案 —— 相当于把线上文案存进 Git，
     以后云端 KV 丢了、或者换了 Worker，文案依然在仓库里。 */
  var exportBtn = document.getElementById('editExportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var now = collect();
      var out = {}, k;
      for (k in content) { if (has(content, k)) out[k] = content[k]; }
      for (k in now) { if (has(now, k)) out[k] = now[k]; }
      var payload = {
        note: '站点文案快照。放到项目根目录并推送到 GitHub，它就会成为页面的默认文案（优先级低于云端 KV、高于 HTML 内置文字）。',
        exportedAt: new Date().toISOString(),
        content: out
      };
      var text = JSON.stringify(payload, null, 2) + '\n';
      var fileName = 'content.json';
      try {
        var blob = new Blob([text], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        toast('已导出 ' + fileName + '（' + Object.keys(out).length + ' 条）—— 放进项目根目录，双击 push.bat 即可');
      } catch (e) {
        window.alert('导出失败：' + (e.message || e));
      }
    });
  }

  var resetBtn = document.getElementById('editResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!window.confirm('清空云端那份文案？（所有页面都会回到默认文案；若仓库里有 content.json 就回到它，否则回到 HTML 内置文字。此操作不可撤销）')) return;
      var base = apiBase();
      if (!base || !adminHash) { toast('需要先解锁管理员并配置云端'); return; }
      busy = true;
      setState('正在恢复…', 'warn');
      putCloud({}, function () {
        exitEdit();
        cloud = null;
        cloudReady = true;          // 云端确实被读/写过一次了，全量已知
        content = effective();
        lsSet(KEY_CACHE, '{}');
        apply();
        toast(Object.keys(baked).length ? '已清空云端，回到仓库固化的文案' : '已恢复 HTML 内置文案');
      });
    });
  }

  /* 锁定：退出管理员登录 —— 登录态是全站共用的，这里清掉，其它页面也会退出 */
  var lockBtn = document.getElementById('editLockBtn');
  if (lockBtn) {
    lockBtn.addEventListener('click', function () {
      if (isDirty() && !window.confirm('还有改动没有发布，确定退出吗？')) return;
      exitEdit();
      rememberAdmin('');
      toast('已退出管理员登录');
    });
  }

  var exitBtn = document.getElementById('editExitBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', function () {
      if (isDirty() && !window.confirm('还有改动没有发布，确定退出编辑吗？')) return;
      exitEdit();
    });
  }

  /* ---------- 启动：本机缓存秒开 → 仓库固化文案 / 云端最新（并行，谁后到谁重新合成一次） ---------- */
  try {
    var cached = lsGet(KEY_CACHE);
    if (cached) {
      var o = JSON.parse(cached);
      if (o && typeof o === 'object' && Object.keys(o).length) { content = o; apply(); }
    }
  } catch (e) {}

  loadBaked();
  pull();
})();
