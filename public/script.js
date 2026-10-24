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
    let autoDayOn = false;
    let sceneSkipWrapped = false;
    try { autoDayOn = localStorage.getItem('mdanAutoDay') === '1'; } catch (e) {}
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
      var upName = null;
      try { upName = autoShopUpgrade(); } catch (e) {}
      if (upName) toast('🛠️ Auto Farm: bắt đầu nâng cấp ' + upName + ' cho tiệm');
      var lifeActs = [];
      try { lifeActs = autoLifeRoutine(); } catch (e) {}
      if (lifeActs.length) toast('🌿 Auto Farm: ' + lifeActs.join(', '));
      var promoNames = [];
      try { promoNames = autoPromoteStaff(); } catch (e) {}
      if (promoNames.length) toast('⬆️ Auto Farm: đề bạt ' + promoNames.length + ' nhân sự (' + promoNames.join(', ') + ')');
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

    // ——— TÍNH NĂNG MỚI 11 (v3.11) + PHÂN BỐ LẠI HẠNG (v3.13): Mod người nổi tiếng ———
    // cbDef() là cửa ngõ duy nhất để game lấy thông tin một celeb (hồ sơ, sự kiện, cbHen
    // đều qua đây) nên bọc nó lại: tuổi luôn đưa về 18–24 (tính cố định theo id nên không
    // nhảy số giữa các lần gọi; chặn dữ liệu ghi đè pf) rồi cộng tuoiN để mỗi năm +1.
    // Hạng được phân bố lại toàn bộ 33 người: B:13, A:12, S:8 (thay cho gốc B:15, A:13,
    // S:5). Trong 8 người hạng S: 5 người khác giới với người chơi, 3 người cùng giới
    // (người chơi nam → S: 5 nữ, 3 nam; người chơi nữ → ngược lại). Phân bố xáo trộn
    // giả ngẫu nhiên có seed theo danh sách id + giới tính người chơi nên ổn định giữa
    // các lần nạp game, không nhảy hạng lung tung.
    function celebYoungAge(id) {
      var s = String(id || ''), n = 0;
      for (var i = 0; i < s.length; i++) n += s.charCodeAt(i);
      return 18 + (n % 7);
    }
    // Số năm đã trôi qua trong lượt chơi — game tự cộng vào tuổi celeb qua R5().tuoiN
    // (cũng là cơ chế game dùng để tăng tuổi người nổi tiếng mỗi năm).
    function celebTuoiN() {
      try {
        var R5 = G('R5');
        if (typeof R5 === 'function') { var R = R5(); if (R && R.tuoiN) return R.tuoiN; }
      } catch (e) {}
      return 0;
    }
    // Giới tính người chơi: G.me ('M'/'F').
    function celebPlayerGender() {
      // BUG goc (v3.13-v3.18): gioi tinh nguoi choi nam o bien let G cua game (khong phai
      // window.G), ma helper G('G') cua cheat lai tra ve chinh ham helper (ten G bi
      // shadow trong scope cheat) nen .me luon undefined -> tra null -> autoRecruit
      // dung yen hoan toan, con chia rank/hoso roi ve fallback. Doc tu save (let save
      // khong bi shadow, G('save') lay duoc): uu tien g19 (gioi tinh da chon o man
      // Choi moi), roi den save.genders.
      try {
        var sv = G('save');
        if (sv) {
          var g19 = sv.g19 && sv.g19.genders;
          if (g19 && (g19.me === 'M' || g19.me === 'F')) return g19.me;
          var gs = sv.genders;
          if (gs && (gs.me === 'M' || gs.me === 'F')) return gs.me;
        }
      } catch (e) {}
      try {
        var Gg = G('G');
        if (Gg && (Gg.me === 'M' || Gg.me === 'F')) return Gg.me;
      } catch (e) {}
      return null;
    }
    function celebSeededShuffle(arr, seed) {
      var a = arr.slice(), s = (seed >>> 0) || 1;
      function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; }
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    // Bảng phân hạng id -> 'B'/'A'/'S', tính 1 lần rồi cache theo giới tính người chơi.
    // Lưu ý: cbAll() gọi cbDef() nên khi xây bảng từ trong bản bọc phải tạm trả cbDef
    // về bản gốc để tránh đệ quy vô hạn (đoạn này chạy đồng bộ nên không ai xen vào).
    var celebRankMap = null, celebRankKey = '';
    function celebBuildRankMap(orig) {
      var pg = celebPlayerGender();
      var key = pg || '?';
      if (celebRankMap && celebRankKey === key) return celebRankMap;
      var roster = null;
      try {
        var cbAll = G('cbAll');
        if (typeof cbAll === 'function') {
          var cur = window.cbDef;
          window.cbDef = orig;
          try { roster = cbAll(); } finally { window.cbDef = cur; }
        }
      } catch (e) {}
      if (!roster || !roster.length) return null;
      var ids = roster.map(function (c) { return c.id; }).sort().join(',');
      var seed = 0;
      for (var k = 0; k < ids.length; k++) seed = ((seed * 31) + ids.charCodeAt(k)) >>> 0;
      var sh = celebSeededShuffle(roster, seed);
      var opp = pg ? sh.filter(function (c) { return c.g !== pg; }) : sh.slice();
      var same = pg ? sh.filter(function (c) { return c.g === pg; }) : [];
      var sSet = opp.slice(0, 5).concat(same.slice(0, 3));
      var rest = sh.filter(function (c) { return sSet.indexOf(c) < 0; });
      var map = {};
      sSet.forEach(function (c) { map[c.id] = 'S'; });
      rest.slice(0, 12).forEach(function (c) { map[c.id] = 'A'; });
      rest.slice(12).forEach(function (c) { map[c.id] = 'B'; });
      celebRankMap = map; celebRankKey = key;
      return map;
    }
    function applyCelebMods() {
      try {
        var cur = window.cbDef;
        if (typeof cur !== 'function' || cur._mdanV313) return;
        var orig = cur;
        var wrapped = function (id) {
          var o = orig(id);
          if (o) {
            // Tuổi gốc 18–24, mỗi năm trong game tự +1 như người thường.
            o.tuoi = celebYoungAge(o.id) + celebTuoiN();
            // Phân bố lại hạng: B:13, A:12, S:8 (S: 5 khác giới + 3 cùng giới).
            var map = celebBuildRankMap(orig);
            if (map && map[o.id]) o.hang = map[o.id];
          }
          return o;
        };
        wrapped._mdanV313 = true;
        window.cbDef = wrapped;
      } catch (e) {}
    }

    // ——— TÍNH NĂNG MỚI 12 (v3.12): Vá bug game kẹt trạng thái người yêu cũ ———
    // Bug gốc của game: singleBegin() (hàm chia tay/ly hôn) đặt S.single và chuyển
    // người yêu thành người cũ trong Danh bạ, nhưng QUÊN xoá S.you — và cả game
    // không chỗ nào xoá S.you cả. Hậu quả: thanh trạng thái vẫn hiện tên người cũ
    // (#hYou đọc thẳng S.you), nút Rủ hẹn hò người nổi tiếng báo "đang có người yêu"
    // và cbHen bị chặn dù đã độc thân. Vá: đang độc thân (S.single) mà S.you còn
    // sót thì dọn sạch + lưu lại + vẽ lại HUD.
    var staleYouFixed = false;
    function fixStaleYou() {
      try {
        var S = G('S');
        if (S && S.single && S.you) {
          S.you = null;
          try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
          refreshUI();
          if (!staleYouFixed) {
            staleYouFixed = true;
            toast('🔧 Đã dọn trạng thái người yêu cũ còn sót (bug của game)');
          }
        }
      } catch (e) {}
    }

    // Đưa thẳng người nổi tiếng đã quen vào Danh bạ như đối tượng hẹn hò: sao đúng
    // nhánh thành công của cbHen() nhưng bỏ qua mọi cổng chặn — đang có người yêu
    // (S.you, dòng chữ "đang có người yêu" ở nút Rủ hẹn hò là nói NGƯỜI CHƠI),
    // chưa độc thân, thiện cảm chưa đủ, hồi chiêu và tung xúc xắc tỉ lệ.
    function dateCeleb() {
      if (!needAlive()) return;
      var S = G('S');
      var cbMetList = G('cbMetList'), cbSt = G('cbSt'), cbToc = G('cbToc'),
          dtNew = G('dtNew'), dtAdd = G('dtAdd'), db5 = G('db5'),
          CB_NGHE = G('CB_NGHE'), DT = G('DT'), R5 = G('R5');
      if (typeof cbMetList !== 'function' || typeof cbSt !== 'function' ||
          typeof dtNew !== 'function' || typeof dtAdd !== 'function' || typeof db5 !== 'function')
        return toast('❌ Không thấy hệ thống người nổi tiếng / danh bạ');
      var max = DT && DT.max ? DT.max : 50;
      var lvId = null;
      try { lvId = typeof R5 === 'function' && R5() ? R5().cbLv : null; } catch (e) {}
      var list = [];
      try {
        list = cbMetList().filter(function (c) {
          var s = cbSt(c.id);
          return s && !s.db && !s.love && c.id !== lvId;
        });
      } catch (e) {}
      if (!list.length) return toast('⭐ Chưa có người nổi tiếng nào đã quen mà chưa vào Danh bạ');
      var added = [];
      for (var i = 0; i < list.length; i++) {
        var c = list[i], s = cbSt(c.id);
        try {
          var D = db5();
          if (D && D.L && D.L.length >= max) { toast('⚠️ Danh bạ đã đầy (' + max + ' người)'); break; }
          var aff = Math.max(50, Math.min(60, Math.round((s.aff || 0) * 0.7)));
          var toc = null;
          try { toc = typeof cbToc === 'function' ? cbToc(c) : null; } catch (e) {}
          var job = CB_NGHE && CB_NGHE[c.nghe] ? CB_NGHE[c.nghe][1] : (c.nghe || '');
          var p = dtNew('app', c.g, { n: c.ten, g: c.g, age: c.tuoi, job: job, per: c.persona, aff: aff, tag: 'cb', cb: c.id, toc: toc });
          if (!p) continue;
          if (c.qg !== 'Việt Nam' && c.n) { p.n = c.n; p.ho = c.ho; p.qt = c.qg; p.kieu = c.kieu; }
          else {
            var nm = String(c.ten || '').trim().split(/\s+/);
            p.n = nm.pop(); p.ho = nm.join(' ') || p.ho; p.qt = 'Việt Nam'; p.kieu = 'vn';
          }
          p.met = { d: S.day, how: 'Quen từ giới nổi tiếng' };
          if (dtAdd(p)) { s.db = p.id; added.push(c.ten); }
        } catch (e) {}
      }
      try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
      refreshUI();
      if (added.length) toast('💘 Đã đưa vào Danh bạ: ' + added.join(', '));
      else toast('⚠️ Chưa đưa được ai vào Danh bạ');
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
        maxStyle(true);
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
        // Popup tin nhan (.mp-card): bam vao vung khong phai nut -> game tu dat fast=true, cac nap() thoat som.
        document.querySelectorAll('.mp-card').forEach(function (el) {
          try { if (el.offsetParent !== null) el.click(); } catch (e) {}
        });
        // Force-complete cac tween dang chay (xe dap, di bo...): tween chi noi suy gia tri, nhay thang ve dich la an toan.
        try {
          var tws = G('tweens');
          if (Array.isArray(tws)) tws.forEach(function (w) { try { if (w && typeof w.ms === 'number') w.t = w.ms; } catch (e) {} });
        } catch (e) {}
      } catch (e) {}
    }

    // ——— TÍNH NĂNG MỚI 14 (v3.14): Nút nổi tự động qua ngày + auto nâng cấp tiệm + skip cảnh ———
    // (a) Skip cảnh: game choi canh bang wait() (fade 320/60/280, chat, hen ho...) va
    // tween() (xe dap 1500ms, di bo 900ms). skipNow() cua game chi xu ly wait co co sk
    // va typing; cac wait thuong va tween chi duoc rut ngan boi spdK. Boc them 2 ham nay:
    // khi Auto Farm BAT thi wait thuong bi tran 50ms (van la timer that nen vong nap()
    // dung gt van chay dung, khong treo tab) va tween ve dich ngay lap tuc.
    function installSceneSkip() {
      try {
        if (sceneSkipWrapped) return;
        var w0 = window.wait, t0 = window.tween;
        if (typeof w0 === 'function' && !w0._mdanSkip) {
          var wW = function (ms, sk) {
            try { if (autoFarmOn && !sk && typeof ms === 'number' && ms > 50) ms = 50; } catch (e) {}
            return w0.apply(this, [ms, sk]);
          };
          wW._mdanSkip = true; window.wait = wW;
        }
        if (typeof t0 === 'function' && !t0._mdanSkip) {
          var tW = function (o, k, a, b, ms) {
            if (autoFarmOn) { try { o[k] = b; } catch (e) {} return Promise.resolve(); }
            return t0.apply(this, [o, k, a, b, ms]);
          };
          tW._mdanSkip = true; window.tween = tW;
        }
        sceneSkipWrapped = true;
      } catch (e) {}
    }
    // (b) Nguong bam nut Qua ngay: nut sdGo luc het ngay co text 'Qua ngày'. Auto Farm cu
    // luon bo qua nut nay (dung o Cuoc doi). Khi nut noi BAT thi bam luon.
    function shouldClickSdGo(sdTxt, dayOn) {
      var t = String(sdTxt || '');
      return t.indexOf('Qua ngày') < 0 || !!dayOn;
    }
    // (c) Xu ly hop thoai cuoi ngay: 'Hết việc hôm nay' -> BAT: bam 'Qua ngày', TAT: dung yen
    // (khong bam, de game doi huynh); hop 'Trước khi ngủ' -> BAT: bam thang 'Ngủ luôn'
    // (nhanh hon duong vong qua Xem dien thoai), TAT: giu nguyen hanh vi cu.
    function dayEndAction(dlgText, dayOn) {
      var t = String(dlgText || '');
      if (t.indexOf('Hết việc hôm nay') >= 0) return dayOn ? 'qua' : 'wait';
      if (t.indexOf('Ngủ luôn') >= 0) return dayOn ? 'ngu' : null;
      return null;
    }
    // (d) Nut noi tu dong qua ngay: chi hien khi Auto Farm dang chay.
    function updateAutoDayBtn() {
      try {
        var b = document.getElementById('mdanAutoDayBtn');
        if (!autoFarmOn) { if (b) b.remove(); return; }
        if (!b) {
          b = document.createElement('button');
          b.id = 'mdanAutoDayBtn';
          Object.assign(b.style, { position: 'fixed', right: '12px', bottom: '110px', zIndex: 1000003,
            padding: '10px 14px', borderRadius: '999px', border: '1px solid #c8b49a',
            fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,.25)' });
          b.addEventListener('click', function () { toggleAutoDay(); });
          document.body.appendChild(b);
        }
        b.textContent = autoDayOn ? '⏭️ Tự động qua ngày: ĐANG BẬT' : '⏭️ Tự động qua ngày: đang tắt';
        b.style.background = autoDayOn ? '#cdeed6' : '#fff8ea';
      } catch (e) {}
    }
    function toggleAutoDay() {
      autoDayOn = !autoDayOn;
      try { localStorage.setItem('mdanAutoDay', autoDayOn ? '1' : '0'); } catch (e) {}
      updateAutoDayBtn();
      toast('⏭️ Tự động qua ngày: ' + (autoDayOn ? 'BẬT (hết ngày sẽ tự sang ngày mới)' : 'TẮT (hết ngày dừng lại như trước)'));
    }
    // (e) Auto nang cap tiem K1: giong het nut 'Nâng cấp' trong tab Nâng cấp tiệm (#ns8).
    // 4 hang muc (thietbi, matbang, congsuat, sao), moi hang muc toi da cap 3; chi thi cong
    // 1 hang muc/luc (nc.b); gia = von * ncCost[cap] lam tron 100k; so ngay = ncDays[cap].
    // Chi lam khi du tien, lay hang muc dau tien con nang duoc va du tien theo thu tu dinh san.
    function autoShopUpgrade() {
      try {
        var kd5 = G('kd5'), k1 = G('k1'), K1 = G('K1'), save = G('save'), S = G('S');
        if (typeof kd5 !== 'function' || typeof k1 !== 'function' || !K1 || !K1.nc) return null;
        var k = kd5(); if (!k) return null;
        var K = k1(k); if (!K || !K.nc) return null;
        var nc = K.nc;
        if (nc.b) return null; // dang thi cong hang muc khac
        var keys = Object.keys(K1.nc);
        for (var i = 0; i < keys.length; i++) {
          var x = keys[i], lv = nc[x] || 0;
          if (lv >= 3) continue;
          var c = Math.round(k.von * K1.ncCost[lv] / 1e5) * 1e5;
          if (!save || save.money < c) continue;
          var ds = K1.ncDays[lv];
          save.money -= c;
          nc.b = { k: x, til: (S.day || 0) + ds };
          try { var k1Time = G('k1Time'); if (typeof k1Time === 'function') k1Time(K1.time ? K1.time.nc : 30); } catch (e) {}
          try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
          try { var updHUD = G('updHUD'); if (typeof updHUD === 'function') updHUD(); } catch (e) {}
          return K1.nc[x].n;
        }
      } catch (e) {}
      return null;
    }
    // Chua lanh gia tri spd vo hieu do ban cu ghi (spd=5): game UI khong bao gio tao ra
    // gia tri nay, spd5() tu fallback ve 1 nen dua ve 1 cho sach.
    var spdFixed = false;
    function normalizeSpdOnce() {
      try {
        if (spdFixed) return; spdFixed = true;
        var X5 = G('X5');
        if (typeof X5 === 'function') {
          var X = X5();
          if ([0.75, 1, 1.5, 2].indexOf(X.spd) < 0) {
            X.spd = 1;
            var persist = G('persist'); if (typeof persist === 'function') persist();
            var spdApply = G('spdApply'); if (typeof spdApply === 'function') spdApply();
          }
        }
      } catch (e) {}
    }

    // ——— TÍNH NĂNG MỚI 15 (v3.15): Auto farm — từ chối tổng đài lừa đảo, đề bạt nhân sự, ghi trí nhớ ———
    // (a) Tổng đài lừa đảo: game dung SCAM_ST (who bat dau 'Số lạ', call nhac 'trúng giải'),
    // hien qua msgPop (#mpop > .mp-card) voi 2 nut [yes, no]; chon no (index 1) la an toan
    // (chi them tin bao giai trao cho nguoi khac), chon yes la mat tien. Nhan dien: header
    // co 'Số lạ' + chat co 'trúng' + co nut tu choi. .mp-card chi ton tai khi popup mo
    // (dong la innerHTML='') nen gap card la biet dang mo.
    function isScamMp(headerText, chatText) {
      var h = String(headerText || ''), c = String(chatText || '');
      return h.indexOf('Số lạ') >= 0 && c.indexOf('trúng') >= 0;
    }
    function scamRejectIndex(labels) {
      var rej = -1, acc = -1;
      for (var i = 0; i < labels.length; i++) {
        var t = String(labels[i] || '');
        if (/không tin|ngắt máy|cúp máy|lừa đảo/i.test(t)) { if (rej < 0) rej = i; }
        if (/làm theo/i.test(t)) { if (acc < 0) acc = i; }
      }
      if (rej >= 0) return rej;
      if (labels.length === 2 && acc >= 0) return acc === 0 ? 1 : 0;
      return -1;
    }
    function tryScamMp() {
      // true = dang co popup lua dao (da bam tu choi hoac dang doi nut hien ra): dung yen,
      // khong bam lung tung phia sau modal.
      try {
        var card = document.querySelector('.mp-card');
        if (!card) return false;
        var hdr = card.querySelector('.mp-h');
        var chat = card.querySelector('.mp-chat');
        if (!hdr || !chat) return false;
        if (!isScamMp(hdr.textContent || '', chat.textContent || '')) return false;
        var btns = card.querySelectorAll('.mp-ch button');
        if (btns && btns.length) {
          var labels = [];
          for (var i = 0; i < btns.length; i++) labels.push(btns[i].textContent || '');
          var idx = scamRejectIndex(labels);
          if (idx >= 0 && btns[idx] && !btns[idx].disabled) btns[idx].click();
        }
        return true;
      } catch (e) { return false; }
    }
    // (b) Hop 'Ghi vào trí nhớ?': nut .go chi render khi con slot (S.notes.length < save.slots)
    // nen bam .go luon an toan; khong co .go (day slot) thi dung yen cho huynh tu quyet.
    function tryNoteAsk() {
      try {
        var box = document.getElementById('noteAsk');
        if (!box || box.hidden) return false;
        var go = box.querySelector('.go:not([disabled])');
        if (go) go.click();
        return true;
      } catch (e) { return false; }
    }
    // (c) Auto de bat nhan su: dung he thong NS cua game. Dieu kien (nsDbOk): co cap tiep
    // theo, nang luc >= muc, tham nien >= ngay, gan bo >= muc, khong dang thu viec.
    // Tac dung (nsDeBat): chuc vu +1, luong tinh lai (kd/hc), gan bo +8, nang luc +3 (max 95).
    function autoPromoteStaff() {
      var done = [];
      try {
        var nsAll = G('nsAll'), nsDbOk = G('nsDbOk'), nsDeBat = G('nsDeBat'), nsTen = G('nsTen');
        if (typeof nsAll !== 'function' || typeof nsDbOk !== 'function' || typeof nsDeBat !== 'function') return done;
        ['vp', 'kd', 'hc'].forEach(function (env) {
          var list = [];
          try { list = nsAll(env) || []; } catch (e) {}
          list.forEach(function (p) {
            if (!p) return;
            try {
              if (!nsDbOk(p)) return;
              var r = nsDeBat(env, p);
              if (r && r.ok) {
                var nm = p.n;
                try { if (typeof nsTen === 'function') nm = nsTen(p); } catch (e) {}
                done.push(nm);
              }
            } catch (e) {}
          });
        });
      } catch (e) {}
      return done;
    }

    // ——— TÍNH NĂNG MỚI 16 (v3.16): Tuyển dụng 10 hồ sơ chia giới tính + auto hành động đời sống ———
    // (a) Tuyển dụng: game goc nsCandArrive() moi dot chi them 3 ho so (roi cat tong ve 6).
    // Boc lai: moi dot them 10 ho so moi, chia gioi tinh theo G.me (nam -> 7 nu/3 nam,
    // nu -> 7 nam/3 nu; khong biet gioi tinh thi 5/5). Gioi tinh ung vien von chi nam o ten
    // (nsNewName chon g roi sinh ten theo g, khong luu p.g) nen vua gan p.g vua sinh lai
    // ten theo gioi tinh bang npcName(g,{vn:true}) cho khop.
    function nsCandArriveMod(env) {
      try {
        var ns8 = G('ns8'), nsOn = G('nsOn'), nsCand = G('nsCand'), nsLog = G('nsLog'),
            nsIc = G('nsIc'), nsEnvLabel = G('nsEnvLabel'), sdToast = G('sdToast'),
            S = G('S'), npcName = G('npcName');
        if (typeof ns8 !== 'function' || typeof nsOn !== 'function' || typeof nsCand !== 'function' ||
            typeof nsLog !== 'function' || typeof nsIc !== 'function' || typeof nsEnvLabel !== 'function') return false;
        var N = ns8();
        if (!N) return false;
        N.dang[env] = 0;
        if (!nsOn(env)) return true;
        var day = (S && S.day) || 0;
        var list = (N.cand[env] || []).filter(function (c) { return c && c.until >= day; });
        var fresh = [];
        for (var i = 0; i < 10; i++) fresh.push(nsCand(env));
        var pg = null;
        try { pg = celebPlayerGender(); } catch (e) {}
        var genders = [];
        if (pg === 'M' || pg === 'F') {
          var opp = pg === 'M' ? 'F' : 'M';
          for (var j = 0; j < 7; j++) genders.push(opp);
          for (var k = 0; k < 3; k++) genders.push(pg);
        } else {
          for (var j = 0; j < 5; j++) { genders.push('M'); genders.push('F'); }
        }
        for (var s = genders.length - 1; s > 0; s--) {
          var r = Math.floor(Math.random() * (s + 1));
          var tmp = genders[s]; genders[s] = genders[r]; genders[r] = tmp;
        }
        fresh.forEach(function (p, idx) {
          var g = genders[idx];
          p.g = g;
          try {
            if (typeof npcName === 'function') {
              var nm = npcName(g, { vn: true });
              if (nm) { p.n = nm.n; p.ho = nm.ho; p.kieu = nm.kieu; }
            }
          } catch (e) {}
        });
        N.cand[env] = list.concat(fresh).slice(-20);
        nsLog(nsIc(env) + ' Có 10 hồ sơ ứng tuyển mới. Vào trang ' + nsEnvLabel(env) + ' → Tuyển dụng để phỏng vấn.', 'good');
        try { if (typeof sdToast === 'function') sdToast(nsIc(env) + ' Có hồ sơ ứng tuyển', 'Vào Tuyển dụng để phỏng vấn'); } catch (e) {}
        return true;
      } catch (e) { return false; }
    }
    function installRecruitMod() {
      try {
        var cur = window.nsCandArrive;
        if (typeof cur !== 'function' || cur._mdanV316) return;
        var orig = cur;
        var wrapped = function (env) {
          if (nsCandArriveMod(env)) return;
          return orig(env);
        };
        wrapped._mdanV316 = true;
        window.nsCandArrive = wrapped;
      } catch (e) {}
    }
    // (b) Auto hanh dong doi song (chay 1 lan/ngay trong autoDailyRoutine, dung ham goc
    // cua game nen dieu kien tien/cooldown deu do game tu chan):
    // - skHospital: nam vien (+25 suc khoe, phi 2% tai san [5tr,200tr], cooldown 30 ngay);
    //   them cua rieng: chi khi suc khoe < 80 (tren 80 thi +25 bi tran, phi tien).
    // - skCheckup: kham dinh ky (phi 1.5tr, +6, cooldown 90 ngay).
    // - skGym: tap the duc (phi 600k, goi 30 ngay).
    // - bhDo('qua'/'dulich'/'suanha'): qua lon / dua bo me di choi / sua nha cho bo me
    //   (cooldown 30/90/365 ngay, phi theo % tai san).
    // - dlGo: di du lich voi nguoi yeu (chi khi dang co nguoi yeu, lay muc cao nhat con
    //   du tien + het cooldown: nuoc ngoai 60tr/120 ngay, trong nuoc 15tr/60 ngay, di gan 3tr/30 ngay).
    function autoLifeRoutine() {
      var acts = [];
      try {
        var S = G('S');
        var sk5 = G('sk5');
        if (typeof sk5 === 'function') {
          var hp = null;
          try { hp = sk5().hp; } catch (e) {}
          var skHospital = G('skHospital');
          if (typeof skHospital === 'function' && (hp == null || hp < 80) && skHospital()) acts.push('Nằm viện điều trị');
          var skCheckup = G('skCheckup');
          if (typeof skCheckup === 'function' && skCheckup()) acts.push('Khám định kỳ');
          var skGym = G('skGym');
          if (typeof skGym === 'function' && skGym()) acts.push('Tập thể dục');
        }
        var bhDo = G('bhDo');
        if (typeof bhDo === 'function') {
          if (bhDo('qua')) acts.push('Mua quà lớn cho bố mẹ');
          if (bhDo('dulich')) acts.push('Đưa bố mẹ đi chơi');
          if (bhDo('suanha')) acts.push('Sửa nhà cho bố mẹ');
        }
        var dlGo = G('dlGo');
        if (typeof dlGo === 'function' && S && !S.single) {
          for (var i = 2; i >= 0; i--) {
            if (dlGo(i)) { acts.push('Đi du lịch với người yêu'); break; }
          }
        }
      } catch (e) {}
      return acts;
    }

    // ——— TÍNH NĂNG MỚI 17 (v3.17): Sống X ngày ———
    // Game von co san advanceDays() o cuoi moi ngay choi: gap ngau nhien (doc than 1-3,
    // da cuoi 2-6, dang hen ho 1), cat gap khi gap cot moc quan he (100/200/300/365/500/
    // 730/1000/1095/1500/2000 ngay) hoac ngay co su kien (nextEventDay), cac ngay tua
    // duoc chay dayEcon (luong/thu nhap) + idleStress (cang thang) + ghi nhat ky jSkip.
    // Mod nay khong tua giua ngay (se lam hong vong lap ngay dang chay) ma boc
    // window.advanceDays: huynh nhap X, moi lan game tu goi advanceDays o cuoi ngay thi
    // gap = so ngay con lai (van cat theo cot moc/su kien nhu goc), het X thi tu tra ve
    // hanh vi goc. Su kien hen lich (cho) den han trong thoi gian tua se no vao cuoi
    // ngay choi dau tien sau khi tua (choDaily chay o endOfDay, xu ly ca muc qua han).
    var jumpRemaining = 0, jumpDay0 = 0, jumpSanityDone = false, jumpResumeToasted = false;
    try {
      var jr = parseInt(localStorage.getItem('mdanJumpDays'), 10);
      if (isFinite(jr) && jr > 0) jumpRemaining = jr;
      var jd = parseInt(localStorage.getItem('mdanJumpDay0'), 10);
      if (isFinite(jd) && jd > 0) jumpDay0 = jd;
    } catch (e) {}
    function jumpLeft() { return jumpRemaining; }
    function jumpSave(n) {
      try {
        localStorage.setItem('mdanJumpDays', String(n));
        localStorage.setItem('mdanJumpDay0', String(jumpDay0));
      } catch (e) {}
    }
    function askJumpDays() {
      try {
        var cur = jumpRemaining > 0 ? jumpRemaining : 0;
        var raw = window.prompt(cur > 0
          ? 'Đang tua còn ' + cur + ' ngày. Nhập số ngày mới muốn tua (0 = hủy tua, tối đa 3650):'
          : 'Nhập số ngày muốn sống thêm (1–3650):', cur > 0 ? String(cur) : '7');
        if (raw == null || String(raw).trim() === '') return;
        var n = parseInt(String(raw).trim(), 10);
        if (n === 0) { jumpRemaining = 0; jumpDay0 = 0; jumpSave(0); toast('⏭️ Đã hủy tua ngày.'); return; }
        if (!isFinite(n) || n < 1 || n > 3650) { toast('⏭️ Số ngày không hợp lệ (1–3650).'); return; }
        var S0 = G('S');
        jumpRemaining = n; jumpDay0 = (S0 && S0.day) || 0;
        jumpSanityDone = true; jumpResumeToasted = true;
        jumpSave(n); installJumpWrap();
        toast('⏭️ Đã đặt tua ' + n + ' ngày — sẽ tua ở cuối ngày hôm nay; gặp sự kiện/cột mốc thì dừng lại chơi ngày đó rồi tua tiếp.');
      } catch (e) {}
    }
    async function advanceDaysJump() {
      var S = G('S'), save = G('save');
      var relDay = G('relDay'), nextEventDay = G('nextEventDay'), dayMontage = G('dayMontage'),
          jSkip = G('jSkip'), dayEcon = G('dayEcon'), idleStress = G('idleStress');
      if (!S || typeof relDay !== 'function' || typeof nextEventDay !== 'function' ||
          typeof dayMontage !== 'function' || typeof jSkip !== 'function' ||
          typeof dayEcon !== 'function' || typeof idleStress !== 'function') return false;
      var cur = S.day, rl = relDay();
      var gap = jumpRemaining;
      if (!(gap >= 1)) return false;
      if (!S.single) {
        var ms = [100, 200, 300, 365, 500, 730, 1000, 1095, 1500, 2000];
        for (var mi = 0; mi < ms.length; mi++) {
          var m = ms[mi];
          if (rl < m && rl + gap >= m) { gap = m - rl; S.milestone = m; break; }
        }
      }
      var evd = nextEventDay(cur, cur + gap - 1);
      if (evd) { gap = evd - cur; if (S.milestone && S.milestone > cur + gap) S.milestone = null; }
      if (gap > 1) {
        // Montage khong catch: neu RUN doi giua chung, dayMontage tu nem ABORT va
        // vong lap ngay goc se dung nhu binh thuong (S.day chua doi, remaining nguyen).
        await dayMontage(cur + 1, cur + gap - 1);
        jSkip(cur + 1, cur + gap - 1);
        S.dayPlanDay = cur;
        for (var d = cur + 1; d <= cur + gap - 1; d++) { S.day = d; dayEcon(d); idleStress(d); }
        S.dayPlanDay = null; S.day = cur;
        try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
      }
      S.day = cur + gap;
      if (save && save.best && S.diffId != null && S.day > (save.best[S.diffId] || 0)) {
        save.best[S.diffId] = S.day;
        try { var persist2 = G('persist'); if (typeof persist2 === 'function') persist2(); } catch (e) {}
      }
      jumpRemaining -= gap;
      if (jumpRemaining < 0) jumpRemaining = 0;
      jumpSave(jumpRemaining);
      if (jumpRemaining > 0) toast('⏭️ Tua dừng ở ngày ' + S.day + ' (có sự kiện/cột mốc), còn ' + jumpRemaining + ' ngày — chơi xong ngày này sẽ tua tiếp.');
      else toast('⏭️ Đã sống thêm ' + gap + ' ngày, tới ngày ' + S.day + '.');
      return true;
    }
    function installJumpWrap() {
      try {
        var cur = window.advanceDays;
        if (typeof cur !== 'function' || cur._mdanV317) return;
        var orig = cur;
        var wrapped = async function () {
          if (jumpRemaining > 0) {
            if (await advanceDaysJump()) return;
            // Helper thieu truoc khi doi trang thai: roi ve ham goc de vong ngay khong ket.
          }
          return orig();
        };
        wrapped._mdanV317 = true;
        window.advanceDays = wrapped;
      } catch (e) {}
    }

    // ——— TÍNH NĂNG MỚI 18 (v3.18): Auto farm — tự tuyển gấp + tự nhận thử việc theo giới tính ———
    // Dung ham goc cua game: nsPost(env, true) = tuyen gap (phi gapFee 4tr, rieng vp mien
    // phi; 1 ngay sau co ho so qua cho 'ns8' -> nsCandArrive, tu v3.16 la 10 ho so chia
    // gioi tinh); nsHire(env, c) = nhan thu viec (tu choi neu het cho: nsCanHire = chua
    // du slot hoac chua co du phong; thu viec 30 ngay, luong theo nsRange, xoa khoi
    // N.cand). Loc gioi tinh: nguoi choi nam -> chi duyet ho so nu, nu -> chi duyet
    // ho so nam (doc G.me qua celebPlayerGender). Ho so khong co p.g (ve tu truoc v3.16,
    // game goc khong luu gioi tinh) hoac het han (until < S.day) thi bo qua, khong doan.
    // Chay moi tick cua farm (khong doi sang ngay moi) de ho so ve la nhan ngay; dang
    // tin chi khi: env dang hoat dong, khong co dot nao dang cho (N.dang), con cho
    // (nsCanHire), khong con ho so dung gioi tinh dang cho (de khoi chong dot).
    function autoRecruit(excludeName) {
      var hired = [], posted = [];
      try {
        var ns8 = G('ns8'), nsOn = G('nsOn'), nsCanHire = G('nsCanHire'), nsPost = G('nsPost'),
            nsHire = G('nsHire'), nsTen = G('nsTen'), S = G('S');
        if (typeof ns8 !== 'function' || typeof nsOn !== 'function' || typeof nsCanHire !== 'function' ||
            typeof nsPost !== 'function' || typeof nsHire !== 'function') return { hired: hired, posted: posted };
        var pg = null;
        try { pg = celebPlayerGender(); } catch (e) {}
        if (pg !== 'M' && pg !== 'F') return { hired: hired, posted: posted };
        var want = pg === 'M' ? 'F' : 'M';
        var N = ns8();
        if (!N || !N.cand || !N.dang) return { hired: hired, posted: posted };
        var day = (S && S.day) || 0;
        ['vp', 'kd', 'hc'].forEach(function (env) {
          try {
            if (!nsOn(env)) return;
            var list = (N.cand[env] || []).slice();
            list.forEach(function (c) {
              if (!c || c.g !== want) return;
              if (excludeName) {
                try {
                  var nm0 = c.n;
                  if (typeof nsTen === 'function') nm0 = nsTen(c);
                  if (nm0 === excludeName) return;
                } catch (e) {}
              }
              if (c.until != null && c.until < day) return;
              try {
                if (!nsCanHire(env)) return;
                var r = nsHire(env, c);
                if (r && r.ok) {
                  var nm = c.n;
                  try { if (typeof nsTen === 'function') nm = nsTen(c); } catch (e) {}
                  hired.push(nm);
                }
              } catch (e) {}
            });
            var pending = (N.cand[env] || []).filter(function (c) { return c && (c.until == null || c.until >= day); });
            var matchingPending = pending.some(function (c) { return c.g === want; });
            if (!N.dang[env] && nsCanHire(env) && !matchingPending) {
              try {
                var pr = nsPost(env, true);
                if (pr && pr.ok) posted.push(env);
              } catch (e) {}
            }
          } catch (e) {}
        });
      } catch (e) {}
      return { hired: hired, posted: posted };
    }
    var recruitDialogFor = null;
    function findCandById(id) {
      try {
        var ns8f = G('ns8');
        if (typeof ns8f !== 'function') return null;
        var Nf = ns8f();
        if (!Nf || !Nf.cand) return null;
        var envs = ['vp', 'kd', 'hc'];
        for (var i = 0; i < envs.length; i++) {
          var L = Nf.cand[envs[i]] || [];
          for (var j = 0; j < L.length; j++) if (L[j] && L[j].id === id) return { env: envs[i], c: L[j] };
        }
      } catch (e) {}
      return null;
    }
    function candDisplayName(c) {
      try {
        var nsTenDu = G('nsTenDu');
        if (typeof nsTenDu === 'function') return nsTenDu(c);
      } catch (e) {}
      try {
        var nsTen2 = G('nsTen');
        if (typeof nsTen2 === 'function') return nsTen2(c);
      } catch (e) {}
      return c.n;
    }
    // Buoc tuyen dung moi tick: uu tien bam nut UI nhu huynh thao tac tay (panel mo),
    // roi ve goi ham truc tiep khi panel khong mo. Thu tu: (a) hop phong van do cheat
    // mo -> bam #nsNhan; (b) panel co nut ho so dung gioi tinh -> bam nut do (cho
    // hop mo o tick sau); (c) nut #nsPostGap dang bat + du tien -> bam dang tuyen gap;
    // (d) goi truc tiep autoRecruit (bo qua ung vien dang hien trong hop cua huynh).
    function recruitStep() {
      try {
        var pg = null;
        try { pg = celebPlayerGender(); } catch (e) {}
        if (pg !== 'M' && pg !== 'F') return false;
        var want = pg === 'M' ? 'F' : 'M';
        var S = G('S');
        var day = (S && S.day) || 0;
        var dialogName = null;
        var dlg = null;
        try { dlg = document.getElementById('ns8d'); } catch (e) {}
        if (dlg) {
          try {
            var h2 = dlg.querySelector('h2');
            dialogName = h2 ? (h2.textContent || '') : '';
          } catch (e) {}
          if (recruitDialogFor) {
            var tracked = findCandById(recruitDialogFor);
            var hireBtn = null;
            try { hireBtn = document.getElementById('nsNhan'); } catch (e) {}
            var nameOk = false;
            try { if (tracked && candDisplayName(tracked.c) === dialogName) nameOk = true; } catch (e) {}
            if (tracked && nameOk && hireBtn && !hireBtn.disabled) {
              var nm = candDisplayName(tracked.c);
              hireBtn.click();
              recruitDialogFor = null;
              try {
                var still = document.getElementById('ns8d');
                if (!still) toast('📋 Auto Farm: nhận thử việc ' + nm);
              } catch (e) {}
              return true;
            }
            // Hop het han / cua huynh mo tay / nut bi khoa: bo claim, khong dong vao.
            recruitDialogFor = null;
          }
        }
        try {
          var btns = document.querySelectorAll('.ns-m[data-cand]');
          for (var bi = 0; bi < btns.length; bi++) {
            var bid = btns[bi].dataset && btns[bi].dataset.cand;
            if (!bid) continue;
            var found = findCandById(bid);
            if (!found) continue;
            var cc = found.c;
            if (cc.g !== want) continue;
            if (cc.until != null && cc.until < day) continue;
            btns[bi].click();
            recruitDialogFor = bid;
            return true;
          }
        } catch (e) {}
        try {
          var postBtn = document.getElementById('nsPostGap');
          var sv = G('save');
          if (postBtn && !postBtn.disabled && sv && sv.money >= 4000000) {
            postBtn.click();
            try {
              var postBtn2 = document.getElementById('nsPostGap');
              if (!postBtn2 || postBtn2.disabled) toast('📋 Auto Farm: đã đăng tuyển gấp, 1 ngày nữa có hồ sơ');
            } catch (e) {}
            return true;
          }
        } catch (e) {}
        var r = autoRecruit(dialogName);
        if (r.hired.length) toast('📋 Auto Farm: nhận thử việc ' + r.hired.length + ' người (' + r.hired.join(', ') + ')');
        if (r.posted.length) toast('📋 Auto Farm: đã đăng tuyển gấp (' + r.posted.join(', ') + '), 1 ngày nữa có hồ sơ');
        return r.hired.length > 0 || r.posted.length > 0;
      } catch (e) { return false; }
    }

    // ——— TÍNH NĂNG MỚI 20 (v3.20): Max điểm phong cách ———
    // Phong cach khong phai chi so luu san: sh9Agg() tinh tu do dang so huu (moi
    // nhom lay top SH9_PCN mon co pc cao nhat, do cu nhan 0.5, do tieu hao khong
    // tinh) + cac boost tam o.tmp, roi kep tran 100. Game tu tao boost tam khi
    // DUNG do tieu hao co f.pc: o.tmp.push({pc, until: S.day+30}).
    // Cheat lam dung vay: xoa boost cu cua cheat (danh dau _mdan), tinh lai pc,
    // bu phan thieu bang 1 boost tam 30 ngay. Farm chay moi ngay nen boost duoc
    // lam moi hang ngay (thuc chat vinh vien khi farm bat); tat farm thi het han
    // sau 30 ngay nhu do tieu hao that.
    function maxStyle(silent) {
      try {
        var sh9 = G('sh9'), sh9Agg = G('sh9Agg'), S = G('S');
        if (typeof sh9 !== 'function' || typeof sh9Agg !== 'function' || !S || !S.alive) return;
        var o = sh9();
        if (!o) return;
        o.tmp = (o.tmp || []).filter(function (t) { return !t._mdan; });
        o.agg = null;
        var cur = 0;
        try { cur = sh9Agg().pc || 0; } catch (e) {}
        if (cur < 100) {
          o.tmp.push({ pc: 100 - cur, until: S.day + 30, _mdan: 1 });
          o.agg = null;
          try { var persist = G('persist'); if (typeof persist === 'function') persist(); } catch (e) {}
          try { var updHUD = G('updHUD'); if (typeof updHUD === 'function') updHUD(); } catch (e) {}
        }
        if (!silent) toast('✨ Phong cách = 100/100');
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
            if (X._mdanSpdBak == null) X._mdanSpdBak = ([0.75, 1, 1.5, 2].indexOf(X.spd) >= 0 ? X.spd : 1);
            X.spd = 2; // SPD5 chi co [0.75,1,1.5,2]; dat 5 bi spd5() loai ve 1 (spdK=1.5, cham hon ca mac dinh). 2 -> spdK=0.75, wait/tween/CSS nhanh gap doi so voi truoc.
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
      if (tryNoteAsk()) return;
      if (tryScamMp()) return;
      if (recruitStep()) return;

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
        var dlgAct = dayEndAction(dlg.textContent || '', autoDayOn);
        if (dlgAct === 'wait') return; // het ngay, nut noi dang TAT: dung yen cho huynh
        if (dlgAct === 'qua') {
          var qBtn = dlg.querySelector('.evopt:not([disabled])');
          if (qBtn) { qBtn.click(); return; }
        }
        if (dlgAct === 'ngu') {
          var nBtn = null;
          dlg.querySelectorAll('button').forEach(function (bb) {
            if (!nBtn && (bb.textContent || '').indexOf('Ngủ luôn') >= 0 && !bb.disabled) nBtn = bb;
          });
          if (nBtn) { nBtn.click(); return; }
        }
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
        if (shouldClickSdGo(sdTxt, autoDayOn)) {
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
        installSceneSkip();
        updateAutoDayBtn();
        if (!hintOn) toggleHint();
        if (!workFxOn) toggleWorkFx();
        if (!turboOn) toggleTurbo();
        try { maxShopStat(true); } catch (e) {}
        autoFarmWorker = createWorkerInterval(runAutoFarm, 250);
        toast('🌾 Auto Farm & Vận hành tiệm: BẬT');
      } else {
        updateAutoDayBtn();
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
      try { applyCelebMods(); } catch (e) {}
      try { fixStaleYou(); } catch (e) {}
      try { normalizeSpdOnce(); } catch (e) {}
      try { installRecruitMod(); } catch (e) {}
      try { installJumpWrap(); } catch (e) {}
      try {
        if (jumpRemaining > 0 && !jumpSanityDone) {
          jumpSanityDone = true;
          var Sj = G('S');
          if (Sj && jumpDay0 > 0 && Sj.day < jumpDay0) { jumpRemaining = 0; jumpDay0 = 0; jumpSave(0); }
          else if (!jumpResumeToasted) { jumpResumeToasted = true; toast('⏭️ Đang tua dở còn ' + jumpRemaining + ' ngày (đã lưu từ lần trước) — sẽ tua tiếp ở cuối ngày.'); }
        }
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
            '<div style="font:800 20px/1.2 system-ui">Một Đời An Yên v3.20</div>' +
          '</div>' +
          '<button type="button" data-act="close" style="border:2px solid #3d2a22;background:#f3e3c8;border-radius:999px;padding:8px 14px;font:800 14px system-ui;color:#3d2a22">Đóng</button>' +
        '</div>' +
        '<div style="display:grid;gap:8px" id="mdanCheatList"></div>';
      var items = [
        [autoFarmOn ? '🌾 Auto Farm & Vận hành tiệm: ĐANG BẬT' : '🌾 Auto Farm & Vận hành tiệm: đang tắt', toggleAutoFarm, 'mdanAutoFarmBtn'],
        [(jumpLeft() > 0 ? '⏭️ Đang tua: còn ' + jumpLeft() + ' ngày (bấm để đổi/hủy)' : '⏭️ Sống X ngày…'), askJumpDays, 'mdanJumpBtn'],
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
        ['✨ Max phong cách', function () { maxStyle(false); }],
        ['🌟 Gặp người nổi tiếng', meetCeleb],
        ['💘 Hẹn hò người nổi tiếng', dateCeleb],
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
