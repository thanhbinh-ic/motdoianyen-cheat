(function () {
    'use strict';

    // =========================================================================
    // 0. CHỐNG TẠM DỪNG / CHẠY NGẦM KHÔNG BỊ TRÌ HOÃN KHI CHUYỂN TAB
    // =========================================================================
    (function bypassTabFocus() {
      try {
        Object.defineProperty(document, 'hidden', { get: function () { return false; }, configurable: true });
        Object.defineProperty(document, 'visibilityState', { get: function () { return 'visible'; }, configurable: true });
      } catch (e) {}

      var preventPause = function (e) {
        e.stopImmediatePropagation();
      };

      ['visibilitychange', 'webkitvisibilitychange', 'blur', 'pagehide'].forEach(function (evt) {
        window.addEventListener(evt, preventPause, true);
        document.addEventListener(evt, preventPause, true);
      });
    })();

    // Bộ đếm thời gian bằng Web Worker giúp không bị trình duyệt bóp tốc độ khi ở Tab ẩn
    function createWorkerInterval(fn, ms) {
      try {
        var blob = new Blob([
          'self.onmessage = function(e) {' +
          '  setInterval(function() { self.postMessage("tick"); }, e.data);' +
          '};'
        ], { type: 'application/javascript' });
        var worker = new Worker(URL.createObjectURL(blob));
        worker.onmessage = function () { fn(); };
        worker.postMessage(ms);
        return {
          stop: function () { worker.terminate(); }
        };
      } catch (e) {
        var id = setInterval(fn, ms);
        return {
          stop: function () { clearInterval(id); }
        };
      }
    }

    // =========================================================================
    // 1. BIẾN KHOẢNG VÀ HELPER
    // =========================================================================
    const MENU_ID = 'mdanCheatMenu';
    const BTN_ID = 'mdanCheatCoreBtn';
    const STYLE_ID = 'mdanCheatStyle';

    let turboOn = false;
    let turboWorker = null;
    let hintOn = false;
    let hintTimer = null;
    let workFxOn = false;
    let workFxObs = null;
    let autoFarmOn = false;
    let autoFarmWorker = null;
    let lastFarmDay = -1;
    let hideInbOn = false;
    try { hideInbOn = localStorage.getItem('mdanHideInb') === '1'; } catch (e) {}

    function G(name) {
      try {
        if (typeof window[name] !== 'undefined') return window[name];
      } catch (e) {}
      try {
        return eval(name);
      } catch (e) {}
      return undefined;
    }

    function toast(msg) {
      let t = document.getElementById('mdanCheatToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'mdanCheatToast';
        Object.assign(t.style, {
          position: 'fixed',
          left: '50%',
          bottom: '28%',
          transform: 'translateX(-50%)',
          zIndex: 1000002,
          background: '#2a1a14ee',
          color: '#fff8e6',
          padding: '10px 16px',
          borderRadius: '14px',
          font: '700 14px system-ui,-apple-system,sans-serif',
          boxShadow: '0 8px 24px #0008',
          pointerEvents: 'none',
          maxWidth: '86vw',
          textAlign: 'center',
          opacity: '0',
          transition: 'opacity .2s'
        });
        (document.body || document.documentElement).appendChild(t);
      }
      t.textContent = msg;
      t.style.opacity = '1';
      clearTimeout(t._h);
      t._h = setTimeout(function () { t.style.opacity = '0'; }, 1800);
    }

    function refreshUI() {
      try {
        var fnNames = ['persist', 'updHUD', 'sdRender', 'renderKd', 'kdRender', 'updKd', 'kdUpd', 'renderShop', 'updShop', 'render', 'updUI', 'renderTc', 'updTc', 'renderUm', 'updUm'];
        fnNames.forEach(function (name) {
          var f = G(name);
          if (typeof f === 'function') f();
        });
      } catch (e) {}
    }

    function needAlive() {
      var S = G('S');
      if (!S || !S.alive) {
        toast('⚠️ Cần đang trong một lượt chơi');
        return false;
      }
      return true;
    }

    // ——— Cheats Basic ———
    function addMoney(n) {
      var save = G('save');
      if (!save) return toast('❌ Không thấy save');
      save.money = (save.money || 0) + n;
      refreshUI();
      toast('💰 +' + n.toLocaleString('vi-VN') + 'đ');
    }

    function setMoney() {
      var save = G('save');
      if (!save) return toast('❌ Không thấy save');
      var cur = save.money || 0;
      var raw = prompt('Nhập số tiền muốn đặt (đang có: ' + cur.toLocaleString('vi-VN') + ')', String(cur));
      if (raw == null) return;
      var v = Number(String(raw).replace(/[^\d-]/g, ''));
      if (!Number.isFinite(v)) return toast('❌ Số không hợp lệ');
      save.money = v;
      refreshUI();
      toast('💰 Tiền = ' + v.toLocaleString('vi-VN') + 'đ');
    }

    function maxAff(silent) {
      if (!needAlive()) return;
      var S = G('S');
      S.aff = 100;
      if (S.maxLives) S.lives = S.maxLives;
      refreshUI();
      if (!silent) toast('❤️ Thiện cảm 100 · đầy mạng');
    }

    function maxUt(silent) {
      if (!needAlive()) return;
      G('S').ut = 100;
      refreshUI();
      if (!silent) toast('🤝 Uy tín 100');
    }

    function maxWorkStat(silent) {
      if (!needAlive()) return;
      var S = G('S');
      var workInit = G('workInit');
      try { if (typeof workInit === 'function') workInit(); } catch (e) {}
      if (!S.work) return !silent && toast('❌ Chưa có dữ liệu công việc');
      S.work.hs = 100;
      S.work.qh = 100;
      if (S.work.unemp) S.work.unemp = false;
      refreshUI();
      if (!silent) toast('💼 Hiệu suất & Quan hệ = 100');
    }

    function maxSpirit(silent) {
      if (!needAlive()) return;
      var S = G('S');
      var workInit = G('workInit');
      try { if (typeof workInit === 'function') workInit(); } catch (e) {}
      if (!S.work) return !silent && toast('❌ Chưa có dữ liệu công việc');
      S.work.ct = 0;
      refreshUI();
      if (!silent) toast('🙂 Tinh thần 100');
    }

    function maxFame(silent) {
      if (!needAlive()) return;
      var R5 = G('R5');
      if (typeof R5 !== 'function') return !silent && toast('❌ Không thấy R5()');
      if (R5()) R5().fame = 100;
      refreshUI();
      if (!silent) toast('⭐ Nổi tiếng 100');
    }

    function maxCerts() {
      if (!needAlive()) return;
      var CERT5 = G('CERT5');
      var certSt = G('certSt');
      var S = G('S');
      if (typeof CERT5 !== 'object' || !CERT5) return toast('❌ Không thấy hệ thống bằng cấp');
      var C = null;
      try { C = typeof certSt === 'function' ? certSt() : null; } catch (e) { C = null; }
      if (!C) {
        var X5 = G('X5');
        if (typeof X5 === 'function') {
          var X = X5();
          C = X.cert || (X.cert = {});
        }
      }
      if (!C) return toast('❌ Không thấy certSt');
      var n = 0;
      Object.keys(CERT5).forEach(function (k) {
        C[k] = { st: 'co', d: S.day || 1, auto: 1 };
        n++;
      });
      refreshUI();
      toast('🎓 Max ' + n + ' bằng cấp');
    }

    function setJobLevel() {
      if (!needAlive()) return;
      var S = G('S');
      var workInit = G('workInit');
      try { if (typeof workInit === 'function') workInit(); } catch (e) {}
      if (!S.work) return toast('❌ Chưa có dữ liệu công việc');
      var W = S.work;
      var env = W.env || 'vp';
      var isFL = env === 'fl';
      var VP_NAME = G('LV_NAME') || [
        'Thực tập sinh', 'Nhân viên', 'Chuyên viên', 'Trưởng nhóm',
        'Phó phòng', 'Trưởng phòng', 'Giám đốc', 'CEO'
      ];
      var FL_NAME = ['Mới vào nghề', 'Có khách quen', 'Được giới thiệu', 'Có tiếng', 'Chuyên gia'];
      var NAMES = isFL ? FL_NAME : VP_NAME;
      var maxLv = NAMES.length;
      var cur = Math.min(Math.max(W.lv || 1, 1), maxLv);
      var label = isFL ? 'Freelancer' : 'Văn phòng';
      var list = NAMES.map(function (n, i) { return (i + 1) + '. ' + n; }).join('\n');
      var raw = prompt(
        'Cấp bậc · ' + label + ' (1–' + maxLv + '):\n' + list +
        '\n\nHiện tại: ' + cur + ' · ' + (NAMES[cur - 1] || '?'),
        String(cur)
      );
      if (raw == null) return;
      var v = parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 1 || v > maxLv) {
        return toast('❌ Chọn số từ 1 đến ' + maxLv);
      }
      W.lv = v;
      W.lvSeen = v;
      W.lvDay = S.day || 1;
      W.unemp = false;
      if (isFL && W.pts != null) {
        var FLCFG = G('FLCFG');
        if (FLCFG && Array.isArray(FLCFG.pts) && v >= maxLv) {
          W.pts = Math.max(W.pts || 0, (FLCFG.pts[v - 2] || 0) + 1);
        } else if (v >= maxLv) {
          W.pts = Math.max(W.pts || 0, 9999);
        }
      }
      refreshUI();
      toast('👔 ' + label + ': ' + NAMES[v - 1] + ' (bậc ' + v + '/' + maxLv + ')');
    }

    function maxNhanSu(silent) {
      if (!needAlive()) return;
      var n = 0;
      try {
        var nsList = G('nsList');
        var nsAll = G('nsAll');
        var nsOn = G('nsOn');
        ['vp', 'kd', 'hc'].forEach(function (env) {
          try {
            if (typeof nsOn === 'function' && !nsOn(env)) return;
            var list = typeof nsAll === 'function' ? nsAll(env)
              : (typeof nsList === 'function' ? nsList(env) : []);
            (list || []).forEach(function (m) {
              if (!m) return;
              m.nl = 100;
              m.gb = 100;
              if (m.load != null) m.load = 0;
              n++;
            });
          } catch (e) {}
        });
      } catch (e) {}
      try {
        var cd5 = G('cd5');
        if (typeof cd5 === 'function') {
          var C = cd5();
          if (C && Array.isArray(C.L)) {
            C.L.forEach(function (m) {
              if (!m) return;
              m.nl = 100;
              m.gb = 100;
              m.load = 0;
              n++;
            });
          }
        }
      } catch (e) {}
      if (!silent) {
        refreshUI();
        toast(n ? ('👥 Max NL+GB ' + n + ' nhân sự') : '⚠️ Chưa có nhân sự');
      }
    }

    function setIQ() {
      var save = G('save');
      if (!save) return toast('❌ Không thấy save');
      var raw = prompt('Số lần 100IQ muốn có (hiện: ' + (save.iq || 0) + ')', '99');
      if (raw == null) return;
      var v = Math.max(0, parseInt(raw, 10) || 0);
      save.iq = v;
      refreshUI();
      toast('💡 100IQ ×' + v);
    }

    function setMemory() {
      var save = G('save');
      if (!save) return toast('❌ Không thấy save');
      var cur = save.slots || 4;
      var raw = prompt('Số ô trí nhớ về người yêu (1–500, hiện: ' + cur + ')', String(Math.max(cur, 6)));
      if (raw == null) return;
      var v = Math.max(1, Math.min(500, parseInt(raw, 10) || cur));
      save.slots = v;
      refreshUI();
      toast('🧠 Trí nhớ: ' + v + ' ô');
    }

    function maxHealth(silent) {
      if (!needAlive()) return;
      var sk5 = G('sk5');
      if (typeof sk5 !== 'function') return !silent && toast('❌ Không thấy hệ thống sức khỏe');
      var k = sk5();
      if (k) {
        k.hp = 100;
        if (k.ill) k.ill = null;
        if (k.nany) k.nany = null;
        if (k.dead) k.dead = 0;
      }
      refreshUI();
      if (!silent) toast('💪 Sức khỏe 100');
    }

    // ——— TÍNH NĂNG MỚI 1: Max Sức khoẻ + Tâm trạng Thú cưng ———
    // Game lưu thú cưng ở R5().pe9 = { hp: sức khỏe, vui: tâm trạng, sick, ... } (đọc qua pet9())
    function maxPetStat(silent) {
      if (!needAlive()) return;
      var pet9 = G('pet9');
      var p = null;
      try { if (typeof pet9 === 'function') p = pet9(); } catch (e) {}
      if (!p) {
        try { var R5 = G('R5'); if (typeof R5 === 'function') p = R5().pe9; } catch (e) {}
      }
      if (!p) return !silent && toast('❌ Chưa nuôi thú cưng (mua ở Cửa hàng → Thú cưng)');

      p.hp = 100;     // Sức khỏe
      p.vui = 100;    // Tâm trạng
      p.sick = -99;   // reset cooldown ốm

      refreshUI();
      try { var sdRender = G('sdRender'); if (typeof sdRender === 'function') sdRender(); } catch (e) {}
      if (!silent) toast('🐾 ' + (p.ten || 'Thú cưng') + ': Sức khỏe & Tâm trạng = 100');
    }

    // ——— TÍNH NĂNG MỚI 2: Hoàn thành Ước mơ hiện tại ———
    // Game lưu ước mơ ở R5().uo9 = { act:[id đang theo đuổi], st:{}, done:{}, prac:{}, pd:{} }.
    // Mỗi ước mơ có 3 chặng được kiểm tra bằng UO9[id].s[0..2]() trong uo9Check().
    // Cách làm: tạm cho 3 điều kiện trả về true rồi gọi uo9Check() -> game tự trao thưởng,
    // ghi nhật ký, chuyển ước mơ sang "đã hoàn thành" như bình thường.
    var dreamBusy = false;
    var autoDreamComplete = true; // Auto Farm có tự hoàn thành ước mơ không (nút bật/tắt trong menu)

    function completeDreamsCore() {
      var uo9 = G('uo9'), UO9 = G('UO9'), uo9Check = G('uo9Check');
      if (typeof uo9 !== 'function' || !UO9 || typeof uo9Check !== 'function') return Promise.resolve(-1);
      if (dreamBusy) return Promise.resolve(0);
      var U = uo9();
      var act = (U.act || []).slice();
      if (!act.length) return Promise.resolve(0);

      var backups = [];
      act.forEach(function (k) {
        var d = UO9[k];
        if (!d || !Array.isArray(d.s)) return;
        backups.push([d, d.s]);
        d.s = [function () { return true; }, function () { return true; }, function () { return true; }];
      });
      dreamBusy = true;
      return Promise.resolve()
        .then(function () { return uo9Check(); })
        .catch(function (e) { if (e && e.abort) return; console.error('[MDAN dreams]', e); })
        .then(function () {
          backups.forEach(function (b) { b[0].s = b[1]; });
          dreamBusy = false;
          refreshUI();
          try { var sdRender = G('sdRender'); if (typeof sdRender === 'function') sdRender(); } catch (e) {}
          return act.length - (uo9().act || []).length;
        });
    }

    function completeDreams() {
      if (!needAlive()) return;
      var uo9 = G('uo9');
      if (typeof uo9 !== 'function' || !G('UO9')) return toast('❌ Không thấy hệ thống ước mơ');
      if (!(uo9().act || []).length) return toast('⚠️ Chưa chọn ước mơ nào (Hoạt động → 🌟 Ước mơ)');
      closeMenu(); // tránh menu cheat che bảng thông báo ước mơ của game
      var total = uo9().act.length;
      completeDreamsCore().then(function (n) {
        toast('✨ Đã hoàn thành ' + Math.max(0, n) + '/' + total + ' ước mơ!');
      });
    }

    // ——— v3.6: Auto Farm — việc làm mỗi ngày cho thú cưng + ước mơ ———
    // (1) Chăm thú cưng: pet9Act(an/dao/choi/...) mỗi việc 1 lần/ngày, miễn phí
    function autoPetCare() {
      try {
        var pet9 = G('pet9'), pet9Act = G('pet9Act'), ACT = G('PET9_ACT');
        if (typeof pet9 !== 'function' || typeof pet9Act !== 'function' || !ACT) return;
        if (!pet9()) return;
        Object.keys(ACT).forEach(function (a) { try { pet9Act(a); } catch (e) {} });
      } catch (e) { console.warn('[MDAN autoPet]', e); }
    }

    // (3) Tự chọn ước mơ cho đủ 3 ô; (2) làm việc "hôm nay" của từng ước mơ
    function autoDreamDaily() {
      try {
        var uo9 = G('uo9'), UO9 = G('UO9'), uoDoAct = G('uoDoAct');
        if (typeof uo9 !== 'function' || !UO9) return;
        var S = G('S'), U = uo9();
        Object.keys(UO9).forEach(function (k) {
          if (U.act.length >= 3) return;
          if (U.act.indexOf(k) !== -1 || U.done[k]) return;
          U.act.push(k);
          U.start[k] = S.day;
          U.st[k] = 0;
        });
        if (typeof uoDoAct === 'function') {
          U.act.slice().forEach(function (k) {
            if (UO9[k] && UO9[k].act) { try { uoDoAct(k); } catch (e) {} }
          });
        }
      } catch (e) { console.warn('[MDAN autoDream]', e); }
    }

    function autoDailyRoutine() {
      autoPetCare();
      autoDreamDaily();
      if (autoDreamComplete) completeDreamsCore(); // (4) bảng chúc mừng do Auto Farm tự bấm qua
      else { try { var c = G('uo9Check'); if (typeof c === 'function' && !dreamBusy) { dreamBusy = true; Promise.resolve(c()).catch(function () {}).then(function () { dreamBusy = false; }); } } catch (e) { dreamBusy = false; } }
    }

    function toggleAutoDream() {
      autoDreamComplete = !autoDreamComplete;
      toast('🌟 Auto Farm tự hoàn thành ước mơ: ' + (autoDreamComplete ? 'BẬT' : 'TẮT (chỉ cày tiến độ)'));
      var b = document.getElementById('mdanAutoDreamBtn');
      if (b) {
        b.textContent = autoDreamComplete ? '🌟 Auto hoàn thành ước mơ: ĐANG BẬT' : '🌟 Auto hoàn thành ước mơ: đang tắt';
        b.style.background = autoDreamComplete ? '#e8f7e4' : '#fff8ea';
      }
    }

    // ——— TÍNH NĂNG MỚI 3 (v3.4): Set doanh thu tiệm ———
    // Game lưu doanh thu THÁNG HIỆN TẠI của tiệm ở R5().kd.m.dt (chi phí: .m.cp).
    // Chốt sổ 30 ngày: lãi = m.dt - m.cp, và doanh thu tháng cũng dùng để xét lên sao.
    function parseMoneyInput(raw) {
      var t = String(raw).trim().toLowerCase().replace(/\s+/g, '');
      var m = t.match(/^(-?[\d.,]+)(tỷ|ty|tỉ|b|triệu|tr|m|nghìn|ngàn|k)?$/);
      if (!m) return NaN;
      var num = m[1];
      if (m[2]) num = num.replace(',', '.');                    // "1,5ty" / "1.5ty" -> 1.5
      else num = num.replace(/[.,]/g, '');                       // "286000000" / "286.000.000"
      var v = parseFloat(num);
      var mul = { 'tỷ': 1e9, ty: 1e9, 'tỉ': 1e9, b: 1e9, 'triệu': 1e6, tr: 1e6, m: 1e6, 'nghìn': 1e3, 'ngàn': 1e3, k: 1e3 }[m[2]] || 1;
      return Math.round(v * mul);
    }

    function setShopRevenue() {
      if (!needAlive()) return;
      var kd5 = G('kd5');
      var k = null;
      try { if (typeof kd5 === 'function') k = kd5(); } catch (e) {}
      if (!k || !k.m) return toast('❌ Bạn chưa mở tiệm');
      var fmtS = G('fmtS');
      var f = function (n) { return typeof fmtS === 'function' ? fmtS(n) : n.toLocaleString('vi-VN'); };
      var cur = Math.round(k.m.dt || 0);
      var raw = prompt(
        'Đặt doanh thu THÁNG NÀY của ' + (k.ten || 'tiệm') + '\n' +
        'Hiện tại: ' + f(cur) + ' (' + cur.toLocaleString('vi-VN') + 'đ)\n' +
        'Nhập số đầy đủ hoặc rút gọn: 405tr, 1.5ty, 500000000',
        String(cur)
      );
      if (raw == null) return;
      var v = parseMoneyInput(raw);
      if (!Number.isFinite(v) || v < 0) return toast('❌ Số không hợp lệ');
      k.m.dt = v;
      refreshUI();
      try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
      try { var sdRender = G('sdRender'); if (typeof sdRender === 'function') sdRender(); } catch (e) {}
      toast('🏪 Doanh thu tháng này = ' + f(v));
    }

    // ——— TÍNH NĂNG MỚI 4 (v3.5): Max Đánh giá + Vận hành của tiệm ———
    // Game lưu ở R5().kd.dg (Đánh giá) và R5().kd.vh (Vận hành); chi nhánh ở R5().kd.cn[i].dg / .vh
    function maxShopStat(silent) {
      if (!needAlive()) return;
      var kd5 = G('kd5');
      var k = null;
      try { if (typeof kd5 === 'function') k = kd5(); } catch (e) {}
      if (!k) return !silent && toast('❌ Bạn chưa mở tiệm');
      k.dg = 100;
      k.vh = 100;
      var nCn = 0;
      (k.cn || []).forEach(function (c) {
        if (!c) return;
        c.dg = 100;
        c.vh = 100;
        nCn++;
      });
      if (!silent) {
        refreshUI();
        try { var sdRender = G('sdRender'); if (typeof sdRender === 'function') sdRender(); } catch (e) {}
        toast('🏪 Tiệm: Đánh giá & Vận hành = 100' + (nCn ? ' (+' + nCn + ' chi nhánh)' : ''));
      }
    }

    // ——— TÍNH NĂNG MỚI 5 (v3.7): Mua full tất cả item trong cửa hàng ———
    function buyFullShop() {
      if (!needAlive()) return;
      var save = G('save');
      var S = G('S');
      if (!save) return toast('❌ Không thấy save');
      save.ownV = save.ownV || {};
      save.owned = save.owned || {};
      save.eq = save.eq || {};
      save.enc = save.enc || {};
      save.encMood = save.encMood || {};
      var nNew = 0, nHave = 0, nCon = 0, nPet = 0;

      // A. Cửa hàng SH9
      try {
        var sh9 = G('sh9');
        var sh9Cats = G('sh9Cats');
        var SH9_CON = G('SH9_CON') || {};
        var SH9_ONE = G('SH9_ONE') || {};
        var PET9_SP = G('PET9_SP') || {};
        if (typeof sh9 === 'function' && typeof sh9Cats === 'function') {
          var o = sh9();
          o.own = o.own || {};
          o.first = o.first || {};
          sh9Cats().forEach(function (c) {
            if (!c || c.id === 'dulich') return;
            (c.items || []).forEach(function (i) {
              if (!i || !i.id) return;
              if (PET9_SP[i.id]) { nPet++; return; }
              if (SH9_CON[c.id] || SH9_ONE[i.id]) { nCon++; return; }
              if (o.own[i.id]) { nHave++; return; }
              o.own[i.id] = { d: S.day || 1 };
              o.first[i.id] = 1;
              if (/^(xemay|oto|sieuxe)$/.test(c.id)) save.ownV[i.id] = true;
              nNew++;
            });
          });
          o.agg = null;
        }
      } catch (e) { console.warn('[MDAN buyFullShop SH9]', e); }

      // B. Vật phẩm cửa hàng cũ (SHOP)
      try {
        var SHOP = G('SHOP');
        if (Array.isArray(SHOP)) {
          SHOP.forEach(function (it) {
            if (!it || !it.id) return;
            if (it.type === 'vehicle') {
              if (!save.ownV[it.id]) { save.ownV[it.id] = true; nNew++; }
            } else if (it.type === 'ringE') {
              if (!S.married && !save.ringE) { save.ringE = true; nNew++; }
            } else if (it.type === 'stock' || it.type === 'slot' || it.type === 'enc' || it.type === 'run') {
              // xử lý chung ở dưới
            } else {
              if (!save.owned[it.id]) { save.owned[it.id] = true; nNew++; }
              save.eq[it.id] = true;
            }
          });
        }
        if ((save.slots || 0) < 6) save.slots = 6;
        if ((save.iq || 0) < 99) save.iq = 99;
        var ALL_ITEMS = G('ALL_ITEMS');
        if (Array.isArray(ALL_ITEMS)) {
          ALL_ITEMS.forEach(function (x) { if (x && x.n) save.enc[x.n] = 1; });
        }
        var MOODS = G('MOODS');
        if (Array.isArray(MOODS)) {
          MOODS.forEach(function (m) { if (m && m.id) save.encMood[m.id] = 1; });
        }
      } catch (e) { console.warn('[MDAN buyFullShop SHOP]', e); }

      try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
      refreshUI();
      toast('🛍️ Mua full cửa hàng: +' + nNew + ' món mới' +
        (nHave ? ' · ' + nHave + ' đã có' : '') +
        (nCon ? ' · bỏ qua ' + nCon + ' món dùng 1 lần' : '') +
        (nPet ? ' · ' + nPet + ' thú cưng (chỉ nuôi được 1)' : ''));
    }

    // ——— TÍNH NĂNG MỚI 6 (v3.7): Max mức thân gia đình ———
    function maxFamilyThan(silent) {
      if (!needAlive()) return;
      var gp5 = G('gp5');
      if (typeof gp5 !== 'function') return !silent && toast('❌ Không thấy hệ thống Gia đình');
      var GF = null;
      try { GF = gp5(); } catch (e) {}
      if (!GF || !Array.isArray(GF.ppl)) return !silent && toast('❌ Chưa có dữ liệu gia đình');
      var n = 0;
      GF.ppl.forEach(function (x) {
        if (!x || x.alive === false) return;
        x.than = 100;
        if (x.kid) x.kid.gk = 100;
        n++;
      });
      if (!silent) {
        try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
        refreshUI();
        toast(n ? ('👪 Mức thân = 100 cho ' + n + ' người thân') : '⚠️ Chưa có người thân nào');
      }
    }

    // ——— TÍNH NĂNG MỚI 7 (v3.7): Max thiện cảm danh bạ ———
    function maxContactsAff(silent) {
      if (!needAlive()) return;
      var n = 0, nCb = 0;
      try {
        var db5 = G('db5');
        if (typeof db5 === 'function') {
          var D = db5();
          (D.L || []).forEach(function (p) {
            if (!p) return;
            p.aff = 100;
            n++;
          });
        }
      } catch (e) {}
      try {
        var cb5 = G('cb5');
        if (typeof cb5 === 'function') {
          var B = cb5();
          Object.keys(B.L || {}).forEach(function (id) {
            var s = B.L[id];
            if (s && s.met) { s.aff = 100; nCb++; }
          });
        }
      } catch (e) {}
      if (!silent) {
        try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
        refreshUI();
        toast((n || nCb)
          ? ('📇 Thiện cảm = 100 cho ' + n + ' liên hệ' + (nCb ? ' + ' + nCb + ' người nổi tiếng' : ''))
          : '⚠️ Danh bạ đang trống');
      }
    }

    // ——— TÍNH NĂNG MỚI 9 (v3.9): Max điểm tín dụng CIC ———
    // Điểm CIC nằm ở bankSt().cic, thang 300–850 (game kẹp bằng cicClamp);
    // 850 = hạng "Rất tốt", được giữ tối đa 4 khoản vay cùng lúc (cicSlots).
    // Ưu tiên đi qua cicAdd() của game để nhật ký điểm (cicLog) vẫn nhất quán.
    function maxCIC(silent) {
      if (!needAlive()) return;
      var bankSt = G('bankSt');
      if (typeof bankSt !== 'function') return !silent && toast('❌ Không thấy hệ thống ngân hàng');
      var B = null;
      try { B = bankSt(); } catch (e) {}
      if (!B) return !silent && toast('❌ Chưa có dữ liệu ngân hàng');
      if (!Array.isArray(B.cicLog)) B.cicLog = [];
      if (typeof B.cic !== 'number' || !isFinite(B.cic)) {
        var cicInit210 = G('cicInit210');
        try { B.cic = typeof cicInit210 === 'function' ? cicInit210(B) : 600; }
        catch (e) { B.cic = 600; }
      }
      if (B.cic < 850) {
        var cicAdd = G('cicAdd');
        var done = false;
        if (typeof cicAdd === 'function') {
          try { cicAdd(850 - B.cic, 'Cheat Menu'); done = B.cic >= 850; } catch (e) {}
        }
        if (!done) B.cic = 850;
      }
      refreshUI();
      if (!silent) toast('🏦 Điểm CIC = 850 (Rất tốt)');
    }

    // ——— TÍNH NĂNG MỚI 10 (v3.9, nâng cấp v3.10): Gặp người nổi tiếng ngay lập tức ———
    // Bình thường cbDaily() chỉ cho "gặp tình cờ" với tỉ lệ ~2,2% + theo độ nổi tiếng
    // mỗi ngày (hồi chiêu 14 ngày) và sự kiện với người đã quen tỉ lệ 10%/ngày.
    // Hàm này bỏ qua tỉ lệ + hồi chiêu, gọi thẳng cbEvent() của game:
    // còn người chưa gặp -> thẻ "Gặp tình cờ" (tinh_co_gap);
    // đã gặp hết -> 1 sự kiện ngẫu nhiên với người đã quen (ưu tiên loại còn đủ điều kiện).
    async function meetCeleb() {
      if (!needAlive()) return;
      var S = G('S');
      var cbAll = G('cbAll'), cbSt = G('cbSt'), cb5 = G('cb5'),
          cbEvent = G('cbEvent'), cbMetList = G('cbMetList'), cbEligible = G('cbEligible');
      if (typeof cbAll !== 'function' || typeof cbSt !== 'function' ||
          typeof cb5 !== 'function' || typeof cbEvent !== 'function')
        return toast('❌ Không thấy hệ thống người nổi tiếng');
      var B = cb5();
      var un = [];
      try { un = cbAll().filter(function (c) { return c && !cbSt(c.id).met; }); } catch (e) {}
      closeMenu();
      await new Promise(function (r) { setTimeout(r, 80); });
      try {
        if (un.length) {
          var c = un[Math.floor(Math.random() * un.length)];
          B.meetCd = S.day; B.evD = S.day;
          await cbEvent('tinh_co_gap', c);
          // v3.10: nếu màn gặp gỡ thành công (đã "quen"), đẩy thiện cảm lên 100,
          // xoá hồi chiêu và mở luôn bước Xin liên lạc (cbTry 'lien') cho nối mạch.
          try {
            var s = cbSt(c.id);
            if (s && s.met) {
              s.aff = 100;
              s.cd = 0;
              var persist = G('persist');
              if (typeof persist === 'function') persist();
              toast('⭐ ' + (c.ten || 'Người nổi tiếng') + ': thiện cảm = 100');
              var cbTry = G('cbTry');
              if (typeof cbTry === 'function') {
                await new Promise(function (r) { setTimeout(r, 80); });
                await cbTry(c, 'lien');
              }
            }
          } catch (e) {}
          return;
        }
        var met = [];
        try { met = typeof cbMetList === 'function' ? cbMetList() : []; } catch (e) {}
        if (!met.length) return toast('⭐ Danh sách người nổi tiếng đang trống');
        var kinds = ['moi_tiec', 'tin_don', 'antifan', 'paparazzi', 'hop_bao', 'mot_buoi_dien', 'phim_truong'];
        var cand = [];
        if (typeof cbEligible === 'function') {
          kinds.forEach(function (k) {
            met.forEach(function (cc) {
              try { if (cbEligible(k, cc)) cand.push([k, cc]); } catch (e) {}
            });
          });
        }
        var pair = cand.length
          ? cand[Math.floor(Math.random() * cand.length)]
          : ['tin_don', met[Math.floor(Math.random() * met.length)]];
        B.evCd = S.day; B.evD = S.day;
        await cbEvent(pair[0], pair[1]);
      } catch (e) {
        try { console.warn(e); } catch (err) {}
      }
    }

    function unlockEnc() {
      var save = G('save');
      if (!save) return toast('❌ Không thấy save');
      save.enc = save.enc || {};
      save.encMood = save.encMood || {};
      var n = 0;
      var ALL_ITEMS = G('ALL_ITEMS');
      if (Array.isArray(ALL_ITEMS)) {
        ALL_ITEMS.forEach(function (o) {
          if (o && o.n) {
            if (!save.enc[o.n]) n++;
            save.enc[o.n] = 1;
          }
        });
      } else {
        var CATS = G('CATS');
        if (CATS && typeof CATS === 'object') {
          Object.values(CATS).forEach(function (C) {
            (C.items || []).forEach(function (o) {
              if (o && o.n) {
                if (!save.enc[o.n]) n++;
                save.enc[o.n] = 1;
              }
            });
          });
        }
      }
      var MOODS = G('MOODS');
      if (Array.isArray(MOODS)) {
        MOODS.forEach(function (m) {
          if (m && m.id) save.encMood[m.id] = 1;
        });
      }
      refreshUI();
      try {
        var renderEnc = G('renderEnc');
        if (typeof renderEnc === 'function') renderEnc();
      } catch (e) {}
      toast('📖 Đã mở toàn bộ Bách khoa' + (n ? ' (+' + n + ' mục mới)' : ''));
    }

    function autoMaxAllStats(silent) {
      if (!needAlive()) return;
      try {
        maxAff(true);
        maxUt(true);
        maxWorkStat(true);
        maxSpirit(true);
        maxFame(true);
        maxNhanSu(true);
        maxHealth(true);
        maxPetStat(true);
        maxShopStat(true);
        maxFamilyThan(true);
        maxContactsAff(true);
        maxCIC(true);
        refreshUI();
      } catch (e) {
        console.warn(e);
      }
    }

    // ——— Gợi ý đáp án hẹn ———
    function applyHint() {
      if (!hintOn) return;
      try {
        var S = G('S');
        var ch = S && S.choosing;
        if (!ch || !ch.btns) return;
        var ci = ch.ci;
        var okI = ch.okI;
        ch.btns.forEach(function (b, i) {
          if (!b || b.disabled) return;
          b.classList.remove('mdan-hint-best', 'mdan-hint-ok');
          if (ci >= 0 && i === ci) b.classList.add('right', 'mdan-hint-best');
          else if (okI >= 0 && i === okI) b.classList.add('okay', 'mdan-hint-ok');
        });
      } catch (e) {}
    }

    function toggleHint() {
      hintOn = !hintOn;
      if (hintTimer) { clearInterval(hintTimer); hintTimer = null; }
      if (hintOn) {
        applyHint();
        hintTimer = setInterval(applyHint, 250);
        toast('✅ Gợi ý đáp án: BẬT');
      } else {
        document.querySelectorAll('#choices .choice').forEach(function (b) {
          b.classList.remove('mdan-hint-best', 'mdan-hint-ok', 'right', 'okay');
        });
        toast('✅ Gợi ý đáp án: TẮT');
      }
      var b = document.getElementById('mdanHintBtn');
      if (b) {
        b.textContent = hintOn ? '✅ Gợi ý đáp án: ĐANG BẬT' : '✅ Gợi ý đáp án: đang tắt';
        b.style.background = hintOn ? '#e8f7e4' : '#fff8ea';
      }
    }

    // ——— Kết quả lựa chọn công việc ———
    var workFxBusy = false;
    var workFxCacheKey = '';
    var workFxCacheList = null;
    function scoreLabel(muc) {
      var m = +muc || 0;
      return ['❌ Sai', '△ Đạt', '○ Khá', '★ Hay nhất'][m] || ('muc ' + m);
    }

    function predictWorkFx(rawFx) {
      var fx = rawFx || '';
      try {
        var fxDate = G('fxDate');
        if (typeof fxDate === 'function') fx = fxDate(fx) || fx;
      } catch (e) {}
      var S = G('S');
      var W = S && S.work;
      var WCFG = G('WCFG') || {};
      var hsSoft = WCFG.hsSoft != null ? WCFG.hsSoft : 75;
      var ctGain = WCFG.ctGain != null ? WCFG.ctGain : 1.15;
      var utHidden = G('utHidden');
      var hideUt = typeof utHidden === 'function' && utHidden();
      var fmtS = G('fmtS');
      var hs = 0, qh = 0, ct = 0, ut = 0, tien = 0;
      var extra = [];
      (fx || '').split(/\s+/).forEach(function (t) {
        if (!t) return;
        var m = t.match(/^(HS|QH|CT|KN|UT)([+-]\d+)$/);
        if (m) {
          var k = m[1];
          var v = +m[2];
          if ((k === 'HS' || k === 'QH') && v > 0 && W && (W[k.toLowerCase()] || 0) >= hsSoft) {
            v = Math.ceil(v / 2);
          }
          if (k === 'CT' && v > 0) v = Math.round(v * ctGain);
          if (k === 'HS') hs += v;
          else if (k === 'QH') qh += v;
          else if (k === 'CT') ct += v;
          else ut += v;
          return;
        }
        m = t.match(/^TIEN([+-]\d+)$/);
        if (m) { tien += +m[1]; return; }
        m = t.match(/^TRE\+(\d+)$/);
        if (m) { extra.push('Trễ hẹn ' + m[1] + ' phút'); return; }
        if (t === 'HUY') extra.push('Phải hủy hẹn');
      });
      var o = [];
      var cv = Math.round((hs + qh) / 2);
      if (cv) o.push('Công việc ' + (cv > 0 ? '+' : '−') + Math.abs(cv));
      if (ct) o.push('Tinh thần ' + (ct > 0 ? '−' : '+') + Math.abs(ct));
      if (ut && !hideUt) o.push('Uy tín ' + (ut > 0 ? '+' : '−') + Math.abs(ut));
      if (tien) {
        var abs = Math.abs(tien);
        var money = typeof fmtS === 'function' ? fmtS(abs) : abs.toLocaleString('vi-VN');
        o.push((tien > 0 ? '+' : '−') + money);
      }
      return o.concat(extra).join(' · ') || '(không đổi chỉ số)';
    }

    function normLabel(s) {
      var wkText = G('wkText');
      var t = (typeof wkText === 'function' ? wkText(s) : s) || '';
      return String(t).replace(/\s+/g, ' ').trim();
    }

    function matchCurrentChoices(btnTexts) {
      var key = btnTexts.join('||');
      if (key && key === workFxCacheKey && workFxCacheList) {
        return workFxCacheList;
      }
      var WK = G('WK');
      if (!WK || !WK.byEv) return null;
      var texts = [];
      var i;
      for (i = 0; i < btnTexts.length; i++) {
        var k = String(btnTexts[i] || '').replace(/\s*\(Đang.*$/, '').trim();
        if (k) texts.push(k);
      }
      if (!texts.length) return null;
      var best = null;
      var bestScore = 0;
      var eids = Object.keys(WK.byEv);
      var limit = Math.min(eids.length, 400);
      for (i = 0; i < limit; i++) {
        var chs = WK.byEv[eids[i]] || [];
        if (!chs.length || chs.length < texts.length) continue;
        var labels = [];
        var j;
        for (j = 0; j < chs.length; j++) labels.push(normLabel(chs[j].nhan));
        var hit = 0;
        for (j = 0; j < texts.length; j++) {
          var t = texts[j];
          var ok = false;
          for (var L = 0; L < labels.length; L++) {
            var l = labels[L];
            if (l && (t === l || t.indexOf(l) !== -1 || l.indexOf(t) !== -1)) {
              ok = true;
              break;
            }
          }
          if (ok) hit++;
        }
        if (hit === texts.length && hit > bestScore) {
          bestScore = hit;
          best = chs;
        }
      }
      var result;
      if (best) result = { loose: false, list: best };
      else if (Array.isArray(WK.ch)) result = { loose: true, list: WK.ch };
      else result = null;
      workFxCacheKey = key;
      workFxCacheList = result;
      return result;
    }

    function findChoiceInList(list, btnText, loose) {
      var t = String(btnText || '').replace(/\s*\(Đang.*$/, '').trim();
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        var label = normLabel(c.nhan);
        if (!label) continue;
        if (t === label) return c;
        if (loose && (t.indexOf(label) !== -1 || label.indexOf(t) !== -1)) return c;
      }
      return null;
    }

    function findIvAnswer(btnText) {
      var WK = G('WK');
      if (!WK || !Array.isArray(WK.pa)) return null;
      var t = String(btnText || '').replace(/\s*\(Đang.*$/, '').trim();
      var max = Math.min(WK.pa.length, 300);
      for (var i = 0; i < max; i++) {
        var a = WK.pa[i];
        var label = normLabel(a.nhan);
        if (!label) continue;
        if (t === label || t.indexOf(label) !== -1 || label.indexOf(t) !== -1) return a;
      }
      return null;
    }

    function annotateWorkChoices() {
      if (!workFxOn || workFxBusy) return;
      var box = document.getElementById('phRep');
      if (!box || box.hidden) return;
      var btns = box.querySelectorAll('button.qr');
      if (!btns.length) return;
      var need = false;
      var i;
      for (i = 0; i < btns.length; i++) {
        if (btns[i].dataset.mdanFx !== '1') { need = true; break; }
      }
      if (!need) return;
      workFxBusy = true;
      try {
        var texts = [];
        for (i = 0; i < btns.length; i++) {
          var sp = btns[i].querySelector('span');
          var raw = (sp ? sp.textContent : btns[i].textContent) || '';
          texts.push(raw);
        }
        var matched = matchCurrentChoices(texts);
        var KIEU = { cham: '💪 chăm', ne: '💗 né', khon: '🧠 khéo' };
        for (var j = 0; j < btns.length; j++) {
          var b = btns[j];
          if (b.dataset.mdanFx === '1') continue;
          var text = texts[j] || '';
          var info = null;
          if (matched && matched.list) {
            var c = findChoiceInList(matched.list, text, matched.loose);
            if (c) {
              var predicted = predictWorkFx(c.hieu_qua);
              var kieu = KIEU[c.kieu] || c.kieu || '';
              var rawFx = c.hieu_qua || '';
              info = {
                kind: 'work',
                text: [kieu, predicted].filter(Boolean).join(' · '),
                good: /HS\+|QH\+|UT\+|KN\+|TIEN\+/.test(rawFx) && !/\bHUY\b|TRE\+/.test(rawFx),
                bad: /\bHUY\b|HS-|QH-|UT-|KN-|CT\+/.test(rawFx)
              };
            }
          }
          if (!info) {
            var a = findIvAnswer(text);
            if (a) {
              var m = +a.muc || 0;
              info = {
                kind: 'iv',
                text: scoreLabel(m),
                good: m >= 2,
                bad: m === 0,
                muc: m
              };
            }
          }
          if (!info) continue;
          b.classList.add('mdan-work-fx');
          if (info.good) b.classList.add('mdan-work-good');
          if (info.bad) b.classList.add('mdan-work-bad');
          if (info.kind === 'iv' && info.muc === 3) b.classList.add('mdan-work-best');
          var tag = b.querySelector('.mdan-fx-tag');
          if (!tag) {
            tag = document.createElement('small');
            tag.className = 'mdan-fx-tag';
            b.appendChild(tag);
          }
          tag.textContent = info.text;
          b.dataset.mdanFx = '1';
        }
      } catch (e) {
        console.warn('[MDAN workFx]', e);
      } finally {
        setTimeout(function () { workFxBusy = false; }, 0);
      }
    }

    function scheduleWorkFx() {
      if (!workFxOn || workFxBusy) return;
      if (scheduleWorkFx._t) return;
      scheduleWorkFx._t = setTimeout(function () {
        scheduleWorkFx._t = null;
        annotateWorkChoices();
      }, 120);
    }

    function bindWorkFxObserver() {
      if (workFxObs) {
        workFxObs.disconnect();
        workFxObs = null;
      }
      var box = document.getElementById('phRep');
      if (!box) return;
      workFxObs = new MutationObserver(function () {
        scheduleWorkFx();
      });
      workFxObs.observe(box, { childList: true, subtree: true });
    }

    function toggleWorkFx() {
      workFxOn = !workFxOn;
      workFxCacheKey = '';
      workFxCacheList = null;
      if (workFxObs) {
        workFxObs.disconnect();
        workFxObs = null;
      }
      if (toggleWorkFx._iv) {
        clearInterval(toggleWorkFx._iv);
        toggleWorkFx._iv = null;
      }
      if (scheduleWorkFx._t) {
        clearTimeout(scheduleWorkFx._t);
        scheduleWorkFx._t = null;
      }
      if (workFxOn) {
        annotateWorkChoices();
        bindWorkFxObserver();
        toggleWorkFx._iv = setInterval(function () {
          if (!workFxOn) return;
          var box = document.getElementById('phRep');
          if (!box || box.hidden) return;
          if (!workFxObs) bindWorkFxObserver();
          var btns = box.querySelectorAll('button.qr');
          if (!btns.length) return;
          var need = false;
          for (var i = 0; i < btns.length; i++) {
            if (btns[i].dataset.mdanFx !== '1') { need = true; break; }
          }
          if (need) scheduleWorkFx();
        }, 800);
        toast('💼 Kết quả CV: BẬT');
      } else {
        document.querySelectorAll('#phRep button.qr').forEach(function (b) {
          b.classList.remove('mdan-work-fx', 'mdan-work-good', 'mdan-work-bad', 'mdan-work-best');
          delete b.dataset.mdanFx;
          var tag = b.querySelector('.mdan-fx-tag');
          if (tag) tag.remove();
        });
        toast('💼 Kết quả CV: TẮT');
      }
      var b = document.getElementById('mdanWorkFxBtn');
      if (b) {
        b.textContent = workFxOn ? '💼 Kết quả CV: ĐANG BẬT' : '💼 Kết quả CV: đang tắt';
        b.style.background = workFxOn ? '#e8f7e4' : '#fff8ea';
      }
    }

    // ——— Tăng tốc ———
    function skipOnce() {
      try {
        var skipNow = G('skipNow');
        var timers = G('timers');
        var gt = G('gt');
        if (typeof skipNow === 'function') skipNow();
        if (Array.isArray(timers) && typeof gt === 'number') {
          timers.filter(function (x) { return x && x.sk; }).forEach(function (x) { x.t = gt; });
        }
        var trio = document.getElementById('trio');
        if (trio && !trio.hidden && trio.classList.contains('on') && typeof trio.onclick === 'function') {
          trio.onclick();
          setTimeout(function () { try { if (trio.onclick) trio.onclick(); } catch (e) {} }, 20);
        }
        var hsSkip = document.getElementById('hsSkip');
        if (hsSkip) hsSkip.click();
        ['days', 'multi'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el && !el.hidden) el.click();
        });
        document.querySelectorAll('.dskip').forEach(function (el) {
          var p = el.closest('.cal') || el.parentElement;
          if (p) p.click();
        });
      } catch (e) {}
    }

    function setGameSpeedMax(on) {
      try {
        var X5 = G('X5');
        var persist = G('persist');
        var spdApply = G('spdApply');
        if (typeof X5 === 'function') {
          var X = X5();
          if (on) {
            if (X._mdanSpdBak == null) X._mdanSpdBak = X.spd;
            X.spd = 5;
          } else if (X._mdanSpdBak != null) {
            X.spd = X._mdanSpdBak;
            delete X._mdanSpdBak;
          }
          if (typeof persist === 'function') persist();
          if (typeof spdApply === 'function') spdApply();
        }
      } catch (e) {}
    }

    function toggleTurbo() {
      turboOn = !turboOn;
      setGameSpeedMax(turboOn);
      if (turboWorker) { turboWorker.stop(); turboWorker = null; }
      if (turboOn) {
        turboWorker = createWorkerInterval(skipOnce, 100);
        skipOnce();
        toast('⚡ Tăng tốc: BẬT');
      } else {
        toast('⚡ Tăng tốc: TẮT');
      }
      var b = document.getElementById('mdanTurboBtn');
      if (b) {
        b.textContent = turboOn ? '⚡ Tăng tốc: ĐANG BẬT' : '⚡ Tăng tốc: đang tắt';
        b.style.background = turboOn ? '#e8f7e4' : '#fff8ea';
      }
    }

    // ——— Auto Farm Ngày & Tương tác / Vận hành Tiệm / Chốt & Đóng Bảng Tiệm / Click sdGo ———
    function runAutoFarm() {
      if (!autoFarmOn) return;
      var S = G('S');
      if (!S || !S.alive) return;

      var curDay = S.day || 0;
      if (curDay !== lastFarmDay) {
        lastFarmDay = curDay;
        autoMaxAllStats(true);
        autoDailyRoutine();
      }

      var phGoBtn = document.getElementById('phGo') || document.querySelector('.ph-go, [data-act="ph-go"]');
      if (phGoBtn && !phGoBtn.hidden && phGoBtn.offsetParent !== null && !phGoBtn.disabled) {
        phGoBtn.click();
        return;
      }

      var phRep = document.getElementById('phRep');
      if (phRep && !phRep.hidden && phRep.offsetParent !== null) {
        annotateWorkChoices();
        var bestWorkBtn = phRep.querySelector('button.qr.mdan-work-best') ||
                          phRep.querySelector('button.qr.mdan-work-good') ||
                          phRep.querySelector('button.qr:not([disabled])');
        if (bestWorkBtn) {
          bestWorkBtn.click();
          return;
        }
      }

      var ringBtn = document.getElementById('ring');
      if (ringBtn && !ringBtn.hidden && ringBtn.offsetParent !== null) {
        ringBtn.click();
        return;
      }

      try {
        var msgTrigger = document.querySelector('.ph-unread, [data-act="ph"], #phBtn, .btn-msg, .badge-unread, #m35w .dot, .has-msg, [data-act="chat"], .ph-item.unread, .ph-item .dot, .chat-item.unread, [data-act*="chat"]');
        if (msgTrigger && msgTrigger.offsetParent !== null) {
          msgTrigger.click();
          return;
        }
      } catch (e) {}

      var ch = S.choosing;
      if (ch && Array.isArray(ch.btns) && ch.btns.length > 0) {
        var targetI = (ch.ci >= 0) ? ch.ci : ((ch.okI >= 0) ? ch.okI : 0);
        var targetBtn = ch.btns[targetI] || ch.btns[0];
        if (targetBtn && !targetBtn.disabled) {
          targetBtn.click();
          return;
        }
      }

      try {
        var shopPanel = document.getElementById('ns8') || document.querySelector('[data-env="kd"]');
        if (shopPanel && shopPanel.offsetParent !== null && !shopPanel.hidden) {
          var k1ChotUnbound = shopPanel.querySelector('.k1-chot:not(.done)');
          if (k1ChotUnbound && !k1ChotUnbound.disabled) {
            k1ChotUnbound.click();
            return;
          }

          var k1ChotDone = shopPanel.querySelector('.k1-chot.done, .k1-chot');
          if (k1ChotDone) {
            var nsCloseBtn = document.getElementById('ns8X') || shopPanel.querySelector('.ns-x');
            if (nsCloseBtn && !nsCloseBtn.disabled && nsCloseBtn.offsetParent !== null) {
              nsCloseBtn.click();
              return;
            }
          }
        }

        var globalCloseBtn = document.querySelector('#ns8X, .ns-x');
        if (globalCloseBtn && globalCloseBtn.offsetParent !== null && !globalCloseBtn.disabled) {
          var hasChotBtn = document.querySelector('.k1-chot.done');
          if (hasChotBtn) {
            globalCloseBtn.click();
            return;
          }
        }
      } catch (e) {}

      var dlg = document.getElementById('dialog');
      if (dlg && !dlg.hidden) {
        var planDlgBtn = dlg.querySelector('button[data-act*="plan"], button[data-act*="chot"], button[data-act*="kd"]');
        if (planDlgBtn && !planDlgBtn.disabled) {
          planDlgBtn.click();
          return;
        }
        var giftBtn = dlg.querySelector('button[data-act*="gift"], button[data-act*="tangqua"], .btn-gift');
        if (giftBtn && !giftBtn.disabled) {
          giftBtn.click();
          return;
        }
        var mainBtn = dlg.querySelector('.btn-main, .btn-sec, button:not([disabled])');
        if (mainBtn) {
          mainBtn.click();
          return;
        }
      }

      var sdGoBtn = document.getElementById('sdGo');
      if (sdGoBtn && !sdGoBtn.hidden && sdGoBtn.offsetParent !== null) {
        var sdTxt = (sdGoBtn.textContent || '').trim();
        if (!sdTxt.includes('Qua ngày')) {
          sdGoBtn.click();
          return;
        }
      }

      autoMaxAllStats(true);
      skipOnce();
    }

    function toggleAutoFarm() {
      autoFarmOn = !autoFarmOn;
      if (autoFarmWorker) { autoFarmWorker.stop(); autoFarmWorker = null; }
      if (autoFarmOn) {
        if (!hintOn) toggleHint();
        if (!workFxOn) toggleWorkFx();
        if (!turboOn) toggleTurbo();
        try { maxShopStat(true); } catch (e) {}
        autoFarmWorker = createWorkerInterval(runAutoFarm, 250);
        toast('🌾 Auto Farm & Vận hành tiệm: BẬT');
      } else {
        toast('🌾 Auto Farm & Vận hành tiệm: TẮT');
      }
      var b = document.getElementById('mdanAutoFarmBtn');
      if (b) {
        b.textContent = autoFarmOn ? '🌾 Auto Farm & Vận hành tiệm: ĐANG BẬT' : '🌾 Auto Farm & Vận hành tiệm: đang tắt';
        b.style.background = autoFarmOn ? '#e8f7e4' : '#fff8ea';
      }
    }

    // ——— Menu UI ———
    // ——— TÍNH NĂNG MỚI 8 (v3.8): Gỡ logo 18+ + thanh giờ ở menu, ẩn/hiện nút tin nhắn ———
    // #age18: game tự tạo 1 lần khi nạp; vừa gỡ node vừa có CSS display:none ở ensureStyle
    // nên kể cả game tạo lại vẫn không hiện. #m35sb: thanh đồng hồ + ngày/phiên bản phía trên
    // màn hình menu (menu35() chỉ cập nhật text, không đụng display) nên CSS là đủ.
    // #inb5Btn: KHÔNG được gỡ node — hàm inbBadge() của game thấy thiếu nút sẽ tự tạo lại
    // (đúng như khi xoá bằng F12). Vì vậy ẩn bằng CSS theo id qua class trên <html>:
    // nút dù được tạo lại vẫn bị ẩn; khi tắt tính năng thì game tự quản lý ẩn/hiện như cũ.
    function applyUiTweaks() {
      try {
        var ag = document.getElementById('age18');
        if (ag) ag.remove();
      } catch (e) {}
      try {
        document.documentElement.classList.toggle('mdan-hide-inb', hideInbOn);
      } catch (e) {}
    }
    function toggleHideInb() {
      hideInbOn = !hideInbOn;
      try { localStorage.setItem('mdanHideInb', hideInbOn ? '1' : '0'); } catch (e) {}
      applyUiTweaks();
      var b = document.getElementById('mdanHideInbBtn');
      if (b) {
        b.textContent = hideInbOn ? '✉️ Ẩn nút tin nhắn: ĐANG BẬT' : '✉️ Ẩn nút tin nhắn: đang tắt';
        b.style.background = hideInbOn ? '#e8f7e4' : '#fff8ea';
      }
      toast(hideInbOn ? '✉️ Đã ẩn nút tin nhắn' : '✉️ Đã hiện lại nút tin nhắn');
    }

    function closeMenu() {
      var m = document.getElementById(MENU_ID);
      if (m) m.remove();
    }

    function openMenu() {
      if (document.getElementById(MENU_ID)) {
        closeMenu();
        return;
      }
      var overlay = document.createElement('div');
      overlay.id = MENU_ID;
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: 1000000,
        background: 'rgba(20,12,10,.72)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '12px 12px calc(12px + env(safe-area-inset-bottom, 0px))',
        fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
        WebkitTapHighlightColor: 'transparent'
      });
      var card = document.createElement('div');
      Object.assign(card.style, {
        width: '100%',
        maxWidth: '420px',
        maxHeight: '82vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: '#fffaf2',
        color: '#3d2a22',
        borderRadius: '18px 18px 14px 14px',
        border: '3px solid #3d2a22',
        boxShadow: '0 16px 40px #0008',
        padding: '14px 12px 12px'
      });
      card.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">' +
          '<div>' +
            '<div style="font:800 11px/1.2 system-ui;letter-spacing:.08em;color:#9a7a66;text-transform:uppercase">Cheat Menu</div>' +
            '<div style="font:800 20px/1.2 system-ui">Một Đời An Yên v3.10</div>' +
          '</div>' +
          '<button type="button" data-act="close" style="border:2px solid #3d2a22;background:#f3e3c8;border-radius:999px;padding:8px 14px;font:800 14px system-ui;color:#3d2a22">Đóng</button>' +
        '</div>' +
        '<div style="display:grid;gap:8px" id="mdanCheatList"></div>';
      var items = [
        [autoFarmOn ? '🌾 Auto Farm & Vận hành tiệm: ĐANG BẬT' : '🌾 Auto Farm & Vận hành tiệm: đang tắt', toggleAutoFarm, 'mdanAutoFarmBtn'],
        ['💰 Cộng +50 triệu', function () { addMoney(50000000); }],
        ['💵 Đặt số tiền…', setMoney],
        ['❤️ Max thiện cảm', function () { maxAff(false); }],
        ['🤝 Max uy tín', function () { maxUt(false); }],
        ['🏦 Max điểm CIC', function () { maxCIC(false); }],
        ['👪 Max mức thân gia đình', function () { maxFamilyThan(false); }],
        ['📇 Max thiện cảm danh bạ', function () { maxContactsAff(false); }],
        ['💼 Max công việc', function () { maxWorkStat(false); }],
        ['🙂 Max tinh thần', function () { maxSpirit(false); }],
        ['⭐ Max nổi tiếng', function () { maxFame(false); }],
        ['🌟 Gặp người nổi tiếng', meetCeleb],
        ['🎓 Max bằng cấp', maxCerts],
        ['👔 Cấp bậc công việc…', setJobLevel],
        ['🏪 Set doanh thu tiệm…', setShopRevenue],
        ['⭐ Max Đánh giá & Vận hành tiệm', function () { maxShopStat(false); }],
        ['🛍️ Mua full tất cả item cửa hàng', buyFullShop],
        ['👥 Max NL+GB nhân sự', function () { maxNhanSu(false); }],
        ['💡 Set 100IQ…', setIQ],
        ['🧠 Set trí nhớ…', setMemory],
        ['💪 Max sức khỏe', function () { maxHealth(false); }],
        ['🐾 Max sức khỏe & tâm trạng thú cưng', function () { maxPetStat(false); }],
        [autoDreamComplete ? '🌟 Auto hoàn thành ước mơ: ĐANG BẬT' : '🌟 Auto hoàn thành ước mơ: đang tắt', toggleAutoDream, 'mdanAutoDreamBtn'],
        ['📖 Mở toàn bộ Bách khoa', unlockEnc],
        ['✨ Hoàn thành ước mơ hiện tại', completeDreams],
        [hintOn ? '✅ Gợi ý đáp án: ĐANG BẬT' : '✅ Gợi ý đáp án: đang tắt', toggleHint, 'mdanHintBtn'],
        [workFxOn ? '💼 Kết quả CV: ĐANG BẬT' : '💼 Kết quả CV: đang tắt', toggleWorkFx, 'mdanWorkFxBtn'],
        [turboOn ? '⚡ Tăng tốc: ĐANG BẬT' : '⚡ Tăng tốc: đang tắt', toggleTurbo, 'mdanTurboBtn'],
        [hideInbOn ? '✉️ Ẩn nút tin nhắn: ĐANG BẬT' : '✉️ Ẩn nút tin nhắn: đang tắt', toggleHideInb, 'mdanHideInbBtn']
      ];
      var list = card.querySelector('#mdanCheatList');
      items.forEach(function (item) {
        var label = item[0];
        var fn = item[1];
        var id = item[2];
        var b = document.createElement('button');
        b.type = 'button';
        if (id) b.id = id;
        b.textContent = label;
        var active = (id === 'mdanHintBtn' && hintOn) ||
                     (id === 'mdanTurboBtn' && turboOn) ||
                     (id === 'mdanWorkFxBtn' && workFxOn) ||
                     (id === 'mdanAutoFarmBtn' && autoFarmOn) ||
                     (id === 'mdanAutoDreamBtn' && autoDreamComplete) ||
                     (id === 'mdanHideInbBtn' && hideInbOn);
        Object.assign(b.style, {
          width: '100%',
          textAlign: 'left',
          padding: '13px 14px',
          borderRadius: '14px',
          border: '2px solid #c9a97c',
          background: active ? '#e8f7e4' : '#fff8ea',
          color: '#3d2a22',
          font: '700 15.5px/1.25 system-ui',
          cursor: 'pointer',
          touchAction: 'manipulation'
        });
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          try { fn(); } catch (err) {
            console.error(err);
            toast('❌ Lỗi: ' + ((err && err.message) || err));
          }
        }, true);
        list.appendChild(b);
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeMenu();
      }, true);
      card.querySelector('[data-act="close"]').addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      }, true);
      overlay.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
      overlay.addEventListener('touchend', function (e) { e.stopPropagation(); }, { passive: true });
      overlay.appendChild(card);
      (document.body || document.documentElement).appendChild(overlay);
    }

    // ——— UI CSS & Inject Button ———
    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      var css = document.createElement('style');
      css.id = STYLE_ID;
      css.textContent =
        '#sodoi .sd-core{grid-template-columns:repeat(6,1fr)!important}' +
        '#sodoi .sd-core button{padding-left:3px;padding-right:3px;min-width:0}' +
        '#sodoi .sd-core button b{font-size:13px}' +
        '#' + BTN_ID + '.on{background:#e8f7e4}' +
        '#sodoi .sd-who{min-width:0;overflow:hidden}' +
        '#sodoi .sd-who .l1{display:flex!important;align-items:baseline;gap:6px;min-width:0;width:100%}' +
        '#sodoi #sdName{flex:1 1 auto!important;min-width:0!important;max-width:none!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}' +
        '#sodoi #sdDate{flex:0 0 auto!important;white-space:nowrap!important;overflow:visible!important}' +
        '#m35w{position:relative;z-index:20}' +
        '#age18{display:none!important}' +
        '#m35sb{display:none!important}' +
        'html.mdan-hide-inb #inb5Btn{display:none!important}' +
        '#dialog{z-index:90!important}' +
        '#dialog .card .stack,#dialog .stack{position:relative;z-index:5}' +
        '#dialog .btn-main,#dialog .btn-sec{position:relative;z-index:6}' +
        '#sodoi .sd-nav,#sodoi .sd-bot,.sd-nav{position:relative;z-index:8}' +
        '#choices .choice.mdan-hint-best,#choices .choice.right.mdan-hint-best{' +
          'border-color:#2f9e6a!important;background:#d8f5e6!important;' +
          'box-shadow:0 0 0 2px #2f9e6a55;position:relative}' +
        '#choices .choice.mdan-hint-best::after{' +
          'content:"✓ đúng";position:absolute;right:10px;top:50%;' +
          'transform:translateY(-50%);font:800 12px system-ui;color:#1a7a4c}' +
        '#choices .choice.mdan-hint-ok,#choices .choice.okay.mdan-hint-ok{' +
          'border-color:#c9a24a!important;background:#fff6d6!important}' +
        '#phRep button.qr.mdan-work-fx{' +
          'flex-direction:column;align-items:flex-start;gap:4px;padding-bottom:10px}' +
        '#phRep button.qr .mdan-fx-tag{' +
          'display:block;width:100%;font:700 11.5px/1.3 system-ui;color:#5a4638;' +
          'background:#fff6e0;border-radius:8px;padding:3px 8px;margin-top:2px}' +
        '#phRep button.qr.mdan-work-good .mdan-fx-tag{background:#d8f5e6;color:#1a7a4c}' +
        '#phRep button.qr.mdan-work-bad .mdan-fx-tag{background:#ffe0e0;color:#a33}' +
        '#phRep button.qr.mdan-work-best{border-color:#2f9e6a!important;box-shadow:0 0 0 2px #2f9e6a44}';
      (document.head || document.documentElement).appendChild(css);
    }

    function ensureCoreBtn() {
      ensureStyle();
      var core = document.querySelector('#sodoi .sd-core');
      if (!core) return;
      var btn = document.getElementById(BTN_ID);
      var on = turboOn || hintOn || workFxOn || autoFarmOn;
      if (btn && btn.parentElement === core) {
        var b = btn.querySelector('b');
        if (b) b.textContent = on ? 'ON' : '·';
        btn.classList.toggle('on', on);
        return;
      }
      if (btn) btn.remove();
      btn = document.createElement('button');
      btn.id = BTN_ID;
      btn.type = 'button';
      btn.dataset.st = 'cheat';
      btn.setAttribute('aria-label', 'Menu cheat');
      btn.innerHTML = '<i>🛠</i><b>' + (on ? 'ON' : '·') + '</b>';
      btn.classList.toggle('on', on);
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          var sfx = G('sfx');
          if (sfx && typeof sfx.tap === 'function') sfx.tap();
        } catch (err) {}
        openMenu();
      }, true);
      var luck = core.querySelector('button[data-st="luck"]');
      if (luck && luck.nextSibling) core.insertBefore(btn, luck.nextSibling);
      else if (luck) core.appendChild(btn);
      else core.appendChild(btn);
    }

    function boot() {
      applyUiTweaks();
      ensureCoreBtn();
      setInterval(function () { applyUiTweaks(); ensureCoreBtn(); }, 1200);
    }

    if (document.body) boot();
    else document.addEventListener('DOMContentLoaded', boot);
})();
