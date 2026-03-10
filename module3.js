// ============================================================
//  MODULE 3 — Show Output demo functions
//  Extracted from module3.html to avoid the HTML parser's
//  </script> mis-detection inside template literal strings.
//  Also avoids leaking the inner <html>/<head>/<body> tags
//  which were breaking document structure when inline.
// ============================================================

function showInlineDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; }
  button { padding: 10px 20px; font-size: 16px; cursor: pointer; background: #1a3c8a; color: white; border: none; border-radius: 4px; }
  button:hover { background: #2a5cc7; }
  .code { background: #1e1e1e; color: #67be67; padding: 12px; border-radius: 6px; font-family: monospace; margin-bottom: 20px; font-size: 14px; }
</style>
</head>
<body>
  <div class="code">&lt;button onClick="alert('This is an Alert!')"&gt;Click Me!&lt;/button&gt;</div>
  <button onClick="alert('This is an Alert!')">Click Me!</button>
</body>
</html>`);
}

function showDOMDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; }
  h2   { color: #1a3c8a; }
  .section { margin: 16px 0; padding: 14px; border: 1px solid #ddd; border-radius: 6px; background: #f9f9f9; }
  .label { font-size: 12px; color: #888; margin-bottom: 6px; font-style: italic; }
  button { padding: 8px 16px; background: #1a3c8a; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px; }
  button:hover { background: #2a5cc7; }
  input { padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; margin-top: 6px; }
</style>
</head>
<body>
  <h2>document.getElementById() Demo</h2>
  <div class="section">
    <div class="label">Non-input element — uses .innerHTML</div>
    <p id="p1">I am the original paragraph text.</p>
    <button onclick="document.getElementById('p1').innerHTML = 'Success! Text was changed by JavaScript!'">Change Paragraph</button>
  </div>
  <div class="section">
    <div class="label">Input element — uses .value</div>
    <input type="text" id="input1" value="Original value"><br>
    <button onclick="document.getElementById('input1').value = 'Value set by JavaScript!'">Change Input Value</button>
  </div>
</body>
</html>`);
}

function showVariablesDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; background: #f9f9f9; }
  h2   { color: #1a3c8a; }
  .card { background: white; border: 1px solid #ddd; border-radius: 6px; padding: 14px; margin: 10px 0; }
  .var-name { font-family: monospace; font-weight: bold; color: #c0392b; }
  .var-val  { font-family: monospace; color: #27ae60; }
  .type     { font-size: 12px; color: #888; float: right; }
</style>
</head>
<body>
  <h2>Variables Demo</h2>
  <script>
    let user    = "John";
    let age     = 25;
    let price   = 9.99;
    let active  = true;
    document.addEventListener('DOMContentLoaded', function() {
      var out = document.getElementById('output');
      var vars = [
        { name: 'user',   val: user,   type: 'String'  },
        { name: 'age',    val: age,    type: 'Integer' },
        { name: 'price',  val: price,  type: 'Float'   },
        { name: 'active', val: active, type: 'Boolean' },
      ];
      vars.forEach(function(v) {
        out.innerHTML +=
          '<div class="card"><span class="type">' + v.type + '</span>' +
          '<span class="var-name">let ' + v.name + '</span> = ' +
          '<span class="var-val">' + JSON.stringify(v.val) + '</span></div>';
      });
    });
  <\/script>
  <div id="output"></div>
</body>
</html>`);
}

function showArithmeticDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; background: #f9f9f9; }
  h2   { color: #1a3c8a; }
  .calc { display: flex; flex-direction: column; gap: 10px; margin: 16px 0; }
  .row  { display: flex; align-items: center; gap: 8px; }
  input[type=number] { width: 70px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 15px; }
  select { padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 15px; }
  button { padding: 8px 18px; background: #1a3c8a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
  button:hover { background: #2a5cc7; }
  #result { margin-top: 14px; font-size: 20px; font-weight: bold; color: #1a3c8a; min-height: 28px; }
</style>
</head>
<body>
  <h2>Arithmetic Operators — Interactive Demo</h2>
  <div class="calc">
    <div class="row">
      <input type="number" id="numA" value="10">
      <select id="op">
        <option value="+">+ (add)</option>
        <option value="-">- (subtract)</option>
        <option value="*">* (multiply)</option>
        <option value="/">\/ (divide)</option>
        <option value="%">% (modulo)</option>
      </select>
      <input type="number" id="numB" value="3">
    </div>
    <button onclick="calculate()">= Calculate</button>
  </div>
  <div id="result"></div>
  <script>
    function calculate() {
      var a  = parseFloat(document.getElementById('numA').value);
      var b  = parseFloat(document.getElementById('numB').value);
      var op = document.getElementById('op').value;
      var r;
      if (op === '+') r = a + b;
      else if (op === '-') r = a - b;
      else if (op === '*') r = a * b;
      else if (op === '/') r = b !== 0 ? a / b : 'Cannot divide by zero';
      else r = b !== 0 ? a % b : 'Cannot modulo by zero';
      document.getElementById('result').textContent = a + ' ' + op + ' ' + b + ' = ' + r;
    }
  <\/script>
</body>
</html>`);
}

function showComparisonDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; background: #f9f9f9; }
  h2   { color: #1a3c8a; }
  .row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  input[type=number] { width: 70px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 15px; }
  button { padding: 8px 18px; background: #1a3c8a; color: white; border: none; border-radius: 4px; cursor: pointer; }
  button:hover { background: #2a5cc7; }
  table { border-collapse: collapse; width: 100%; margin-top: 14px; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: center; }
  th { background: #1a3c8a; color: white; }
  .true  { color: #27ae60; font-weight: bold; }
  .false { color: #e74c3c; font-weight: bold; }
</style>
</head>
<body>
  <h2>Comparison Operators Demo</h2>
  <div class="row">
    <label>x = <input type="number" id="vx" value="10"></label>
    <label>y = <input type="number" id="vy" value="5"></label>
    <button onclick="compare()">Compare</button>
  </div>
  <div id="output"></div>
  <script>
    function compare() {
      var x = parseFloat(document.getElementById('vx').value);
      var y = parseFloat(document.getElementById('vy').value);
      var ops = [
        { sym: '==',  desc: 'equal to',         r: x == y  },
        { sym: '!=',  desc: 'not equal to',      r: x != y  },
        { sym: '>',   desc: 'greater than',      r: x > y   },
        { sym: '<',   desc: 'less than',         r: x < y   },
        { sym: '>=',  desc: 'greater or equal',  r: x >= y  },
        { sym: '<=',  desc: 'less or equal',     r: x <= y  },
      ];
      var html = '<table><tr><th>Expression</th><th>Description</th><th>Result</th></tr>';
      ops.forEach(function(o) {
        var cls = o.r ? 'true' : 'false';
        html += '<tr><td><code>x ' + o.sym + ' y</code></td><td>' + o.desc + '</td><td class="' + cls + '">' + o.r + '</td></tr>';
      });
      html += '</table>';
      document.getElementById('output').innerHTML = html;
    }
    compare();
  <\/script>
</body>
</html>`);
}

function showFunctionDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 30px; }
  h2   { color: #1a3c8a; }
  #greeting {
    font-size: 22px;
    font-weight: bold;
    color: #333;
    margin: 20px 0;
    padding: 14px;
    border: 2px dashed #1a3c8a;
    border-radius: 6px;
    text-align: center;
    min-height: 30px;
  }
  button { padding: 10px 22px; background: #1a3c8a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 15px; margin: 4px; }
  button:hover { background: #2a5cc7; }
  .code { background: #1e1e1e; color: #67be67; padding: 12px; border-radius: 6px; font-family: monospace; margin-bottom: 20px; font-size: 13px; }
</style>
</head>
<body>
  <h2>Functions Demo</h2>
  <div class="code">
function greet() {<br>
&nbsp;&nbsp;document.getElementById("greeting").innerHTML = "Hello, World!";<br>
}
  </div>
  <div id="greeting">Click a button to invoke the function!</div>
  <button onclick="greet()">greet() — Hello, World!</button>
  <button onclick="goodbye()">goodbye() — Goodbye!</button>
  <button onclick="reset()">reset() — Reset</button>
  <script>
    function greet()   { document.getElementById('greeting').innerHTML = '👋 Hello, World!'; }
    function goodbye() { document.getElementById('greeting').innerHTML = '👋 Goodbye, World!'; }
    function reset()   { document.getElementById('greeting').innerHTML = 'Click a button to invoke the function!'; }
  <\/script>
</body>
</html>`);
}

function showConditionalsDemo() {
    showOutput(`<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; background: #f9f9f9; }
  h2   { color: #1a3c8a; }
  .row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  label { font-size: 15px; }
  input[type=number] { width: 80px; padding: 7px; border: 1px solid #ccc; border-radius: 4px; font-size: 15px; }
  button { padding: 9px 20px; background: #1a3c8a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
  button:hover { background: #2a5cc7; }
  #result {
    margin-top: 10px;
    padding: 14px 18px;
    border-radius: 6px;
    font-size: 18px;
    font-weight: bold;
    min-height: 26px;
    border-left: 5px solid #1a3c8a;
    background: #fff;
    color: #1a3c8a;
  }
  .branch { font-size: 12px; color: #888; margin-top: 6px; font-style: italic; }
</style>
</head>
<body>
  <h2>Conditionals Demo — Grade Checker</h2>
  <div class="row">
    <label for="score">Enter a score (0 – 100):</label>
    <input type="number" id="score" value="80" min="0" max="100">
    <button onclick="check()">Check</button>
  </div>
  <div id="result"></div>
  <div class="branch" id="branch"></div>
  <script>
    function check() {
      var score = parseInt(document.getElementById('score').value, 10);
      var msg, branch;
      if (score >= 90) {
        msg    = '🏆 Excellent!';
        branch = 'Matched: if (score >= 90)';
      } else if (score >= 75) {
        msg    = '✅ You passed!';
        branch = 'Matched: else if (score >= 75)';
      } else if (score >= 60) {
        msg    = '⚠️ Barely passed.';
        branch = 'Matched: else if (score >= 60)';
      } else {
        msg    = '❌ You failed. Try again!';
        branch = 'Matched: else (no condition — catch-all)';
      }
      document.getElementById('result').textContent = msg;
      document.getElementById('branch').textContent  = branch;
    }
    check();
  <\/script>
</body>
</html>`);
}