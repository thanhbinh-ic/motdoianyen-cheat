export const config = {
  matcher: ['/', '/:path*'],
};

// Sửa lỗi giao diện khi cài trang thành app ra màn hình chính (chế độ standalone, iPhone):
// chuỗi chiều cao 100% html → body → #app → #stage của game bị ngắn hơn màn hình thật
// khoảng vài chục pt, khiến thanh điều hướng dưới bị đẩy lên cao, hở khoảng trống ở đáy.
// Cách sửa: neo #app bằng position:fixed và đặt chiều cao bằng JS đo thực tế
// (biến --mdan-vh: max(innerHeight, visualViewport.height), và khi đang tràn tai thỏ
// với status bar translucent mà viewport bị hụt chiều cao status bar thì dùng
// luôn screen.height) để khung game kéo dài sát đáy trong mọi chế độ.
// Chỉ áp dụng khi standalone (class .mdan-sa hoặc media display-mode),
// mở bằng tab Safari/Chrome bình thường không bị ảnh hưởng.
const PWA_FIX = `<script>
try {
  var SA = navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (SA) {
    document.documentElement.classList.add('mdan-sa');
    var setH = function () {
      try {
        var h = Math.max(window.innerHeight || 0, (window.visualViewport && visualViewport.height) || 0);
        // iOS standalone với status bar translucent (tràn tai thỏ): layout viewport bị hụt
        // đúng chiều cao status bar (tai thỏ 47pt / Dynamic Island 59pt) nên khung app
        // bị co lên, hở đáy. Nếu máy đang ở chế độ tràn tai thỏ (safe-area top > 0),
        // đang cầm dọc và chiều cao đo được hụt một đoạn nhỏ so với màn hình vật lý,
        // thì lấy luôn screen.height làm chiều cao app.
        var probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
        document.documentElement.appendChild(probe);
        var sat = parseFloat(getComputedStyle(probe).paddingTop) || 0;
        probe.remove();
        var diff = (window.screen && screen.height ? screen.height : 0) - h;
        if (sat > 0 && diff > 15 && diff < 90 && (window.innerHeight >= window.innerWidth)) h = screen.height;
        document.documentElement.style.setProperty('--mdan-vh', h + 'px');
      } catch (e) {}
    };
    setH();
    document.addEventListener('DOMContentLoaded', setH);
    window.addEventListener('resize', setH);
    window.addEventListener('orientationchange', function () { setTimeout(setH, 120); });
    if (window.visualViewport) visualViewport.addEventListener('resize', setH);
    [150, 500, 1200].forEach(function (t) { setTimeout(setH, t); });
  }
} catch (e) {}
</script><style id="mdan-pwa-fix">
html.mdan-sa, html.mdan-sa body { height: var(--mdan-vh, 100dvh) !important; }
html.mdan-sa #app { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: auto !important; height: var(--mdan-vh, 100dvh) !important; }
html.mdan-sa #stage { height: 100% !important; max-height: none !important; }
@media (display-mode: standalone) {
  html, body { height: var(--mdan-vh, 100dvh) !important; }
  #app { position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: auto !important; height: var(--mdan-vh, 100dvh) !important; }
  #stage { height: 100% !important; max-height: none !important; }
}
</style>`;

export default async function middleware(request) {
  const url = new URL(request.url);

  // Cho phép lấy tệp script.js tĩnh từ thư mục public
  if (url.pathname === '/script.js') {
    return;
  }

  // Fetch dữ liệu trực tiếp từ trang gốc motdoianyen.com
  const targetUrl = new URL(url.pathname + url.search, 'https://motdoianyen.com');
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': request.headers.get('user-agent') || '',
      'Accept': request.headers.get('accept') || '*/*',
    },
  });

  const contentType = response.headers.get('content-type') || '';

  // Nếu phản hồi là trang HTML, chỉnh meta + chèn CSS sửa lỗi PWA vào <head>
  // và thẻ <script src="/script.js"></script> vào ngay trước </body>
  if (contentType.includes('text/html')) {
    let html = await response.text();

    // Full màn hình qua tai thỏ/dynamic island: đổi status bar sang black-translucent
    // để nội dung app tràn lên sát mép trên thay vì chừa một dải trắng.
    // Game đã có sẵn viewport-fit=cover và padding env(safe-area-inset-top)
    // nên nội dung không bị tai thỏ che mất.
    const STATUS_BAR_META = '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">';
    if (/<meta name="apple-mobile-web-app-status-bar-style"/.test(html)) {
      html = html.replace(
        /(<meta name="apple-mobile-web-app-status-bar-style" content=")[^"]*(")/,
        '$1black-translucent$2'
      );
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', STATUS_BAR_META + '</head>');
    }

    if (html.includes('</head>')) {
      html = html.replace('</head>', PWA_FIX + '</head>');
    }
    const injectScript = `<script src="/script.js"></script></body>`;
    html = html.replace('</body>', injectScript);

    return new Response(html, {
      status: response.status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  // Đối với các tài nguyên khác (JS, CSS, Images, Fonts...), trả về nguyên bản
  return new Response(response.body, response);
}
