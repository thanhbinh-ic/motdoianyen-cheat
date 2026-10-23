export const config = {
  matcher: ['/', '/:path*'],
};

// Sửa lỗi giao diện khi cài trang thành app ra màn hình chính (chế độ standalone, iPhone):
// chuỗi chiều cao 100% html → body → #app → #stage của game bị ngắn hơn màn hình thật
// khoảng vài chục pt, khiến thanh điều hướng dưới bị đẩy lên cao, hở khoảng trống ở đáy.
// Cách sửa: neo #app bằng position:fixed theo visual viewport (toàn màn hình thật)
// và dùng đơn vị 100dvh cho html/body để khung game kéo dài sát đáy.
// Chỉ áp dụng khi standalone (class .mdan-sa hoặc media display-mode),
// mở bằng tab Safari/Chrome bình thường không bị ảnh hưởng.
const PWA_FIX = `<script>try{if(navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches))document.documentElement.classList.add('mdan-sa')}catch(e){}</script><style id="mdan-pwa-fix">
html.mdan-sa, html.mdan-sa body { height: 100% !important; height: 100dvh !important; }
html.mdan-sa #app { position: fixed !important; inset: 0 !important; height: auto !important; }
html.mdan-sa #stage { height: 100% !important; max-height: none !important; }
@media (display-mode: standalone) {
  html, body { height: 100% !important; height: 100dvh !important; }
  #app { position: fixed !important; inset: 0 !important; height: auto !important; }
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

  // Nếu phản hồi là trang HTML, chèn CSS sửa lỗi PWA vào ngay trước </head>
  // và thẻ <script src="/script.js"></script> vào ngay trước </body>
  if (contentType.includes('text/html')) {
    let html = await response.text();
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
