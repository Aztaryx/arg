// ============================================================
//  MODULE 2 — Show Output demo functions
//  Kept in a separate file so the browser's HTML parser never
//  sees the full <html>...</html> document strings inside
//  the template literals. When those strings lived in an
//  inline <script> block, certain browsers would mis-fire
//  their </script> detection and dump the raw JS source onto
//  the page as visible text.
// ============================================================

function showCSSDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; background: #f9f9f9; }
  p {
    color: red;
    text-align: center;
  }
  .label {
    font-size: 13px;
    color: #555;
    margin-bottom: 20px;
    text-align: center;
  }
</style>
</head>
<body>
  <p class="label" style="color:#555; font-size:13px;">The CSS rule below is applied to all &lt;p&gt; elements:</p>
  <pre style="background:#1e1e1e;color:#67be67;padding:12px;border-radius:6px;font-size:13px;">
p {
  color: red;
  text-align: center;
}</pre>
  <hr>
  <p>This paragraph is red and centered.</p>
  <p>So is this one — every &lt;p&gt; gets the same style.</p>
</body>
</html>`);
}

function showBoxModelDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body {
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 360px;
    background: #f0f4fa;
    margin: 0;
  }
  .title { font-size: 16px; font-weight: bold; margin-bottom: 20px; color: #333; }
  .margin-box {
    background: rgba(255, 165, 0, 0.3);
    padding: 20px;
    position: relative;
  }
  .border-box {
    border: 6px solid #e74c3c;
    padding: 20px;
    background: rgba(52, 152, 219, 0.15);
    position: relative;
  }
  .padding-box {
    background: rgba(46, 204, 113, 0.3);
    padding: 20px;
    position: relative;
  }
  .content-box {
    background: white;
    border: 1px dashed #999;
    padding: 14px 22px;
    font-weight: bold;
    color: #222;
    text-align: center;
  }
  .lbl {
    font-size: 11px;
    font-weight: bold;
    color: #555;
    display: block;
    text-align: right;
    padding: 2px 4px;
  }
</style>
</head>
<body>
  <div class="title">CSS Box Model</div>
  <div class="margin-box">
    <span class="lbl" style="color:darkorange;">MARGIN</span>
    <div class="border-box">
      <span class="lbl" style="color:#c0392b;">BORDER</span>
      <div class="padding-box">
        <span class="lbl" style="color:#27ae60;">PADDING</span>
        <div class="content-box">CONTENT</div>
      </div>
    </div>
  </div>
</body>
</html>`);
}

function showBorderDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; background: #f9f9f9; }
  h3   { margin-bottom: 16px; color: #333; }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .item {
    border-width: 3px;
    border-color: #1a3c8a;
    padding: 12px;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    background: #fff;
    color: #222;
  }
</style>
</head>
<body>
  <h3>border-style values</h3>
  <div class="grid">
    <div class="item" style="border-style:dotted">dotted</div>
    <div class="item" style="border-style:dashed">dashed</div>
    <div class="item" style="border-style:solid">solid</div>
    <div class="item" style="border-style:double;border-width:5px">double</div>
    <div class="item" style="border-style:groove;border-color:#888">groove</div>
    <div class="item" style="border-style:ridge;border-color:#888">ridge</div>
    <div class="item" style="border-style:inset;border-color:#888">inset</div>
    <div class="item" style="border-style:outset;border-color:#888">outset</div>
  </div>
</body>
</html>`);
}

function showPseudoDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; background: #f9f9f9; }
  h3   { color: #333; margin-bottom: 10px; }
  .info { font-size: 13px; color: #666; margin-bottom: 20px; }

  a.demo:link    { color: #1a3c8a; }
  a.demo:visited { color: #7a3caa; }
  a.demo:hover   { color: #e74c3c; font-weight: bold; text-decoration: underline wavy; }
  a.demo:active  { color: orange; }

  .legend { margin-top: 24px; font-size: 13px; color: #444; }
  .legend span { display: inline-block; width: 12px; height: 12px;
                 border-radius: 2px; margin-right: 6px; vertical-align: middle; }
  .legend li { margin: 6px 0; list-style: none; }
</style>
</head>
<body>
  <h3>Pseudo-class Demo</h3>
  <p class="info">Interact with the links below to see each state in action.</p>

  <p><a href="#" class="demo">Hover over me! → turns red &amp; bold</a></p>
  <p><a href="#visited" class="demo" style="color:#7a3caa;">I look like a visited link (:visited)</a></p>
  <p><a href="#" class="demo">Click me! → turns orange while held (:active)</a></p>

  <ul class="legend">
    <li><span style="background:#1a3c8a;"></span><strong>:link</strong> — unvisited (blue)</li>
    <li><span style="background:#7a3caa;"></span><strong>:visited</strong> — visited (purple)</li>
    <li><span style="background:#e74c3c;"></span><strong>:hover</strong> — mouse over (red)</li>
    <li><span style="background:orange;"></span><strong>:active</strong> — being clicked (orange)</li>
  </ul>
</body>
</html>`);
}