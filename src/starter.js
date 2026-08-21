export const STARTER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>My tiny website</title>
  <style>
    :root { font:20px/1.5 system-ui; color:#241c15; background:#fff3b0; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px; }
    main { max-width:560px; }
    h1 { font-size:4rem; line-height:.9; }
    button { padding:12px; border:3px solid; background:#ff5c8a; font-weight:bold; }
    .night { color:#fff3b0; background:#241c15; }
  </style>
</head>
<body>
  <main>
    <p>HELLO, INTERNET!</p>
    <h1>Your name</h1>
    <p>Write something about yourself, your idea, or a thing you love.</p>
    <p><a href="https://example.com">Add your favorite link</a></p>
    <button onclick="document.body.classList.toggle('night')">Change the mood</button>
  </main>
</body>
</html>`;
