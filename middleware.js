export const config = {
  matcher: ['/', '/:path*'],
};

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

  // Nếu phản hồi là trang HTML, chèn thẻ <script src="/script.js"></script> vào ngay trước </body>
  if (contentType.includes('text/html')) {
    let html = await response.text();
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
