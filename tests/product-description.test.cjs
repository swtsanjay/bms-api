const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeProductDescriptionHtml: clean } = require('../dist/modules/commerce/product-description');

test('keeps useful formatting and safe links', () => {
  const output = clean('<p>Soft <strong>cotton</strong> and <em>linen</em>.</p><ul><li>Wash cold</li></ul><p><a href="https://example.test/care" title="Care">Care</a> <a href="mailto:help@example.test">Email</a> <a href="/sizes">Sizes</a></p>');
  assert.match(output, /<p>Soft <strong>cotton<\/strong> and <em>linen<\/em>\.<\/p>/);
  assert.match(output, /<ul><li>Wash cold<\/li><\/ul>/);
  assert.match(output, /href="https:\/\/example.test\/care"/);
  assert.match(output, /href="mailto:help@example.test"/);
  assert.match(output, /href="\/sizes"/);
});

test('removes event handlers and script-capable URL schemes', () => {
  const output = clean('<p onclick="alert(1)">Hello <a href="javascript:alert(1)" onmouseover="alert(2)">one</a> <a href="data:text/html,evil">two</a> <a href="&#x6a;avascript:alert(3)">three</a> <a href="//evil.test/path">four</a></p>');
  assert.equal(output, '<p>Hello <a>one</a> <a>two</a> <a>three</a> <a>four</a></p>');
});

test('removes active content and its text while retaining surrounding prose', () => {
  const output = clean('<p>Before<script>alert(1)</script><svg onload="alert(2)"><a href="javascript:alert(3)">bad</a></svg><iframe srcdoc="<script>alert(4)</script>">bad</iframe><object data="evil">bad</object><embed src="evil"><form action="evil">bad</form>After</p>');
  assert.match(output, /Before/);
  assert.match(output, /After/);
  assert.doesNotMatch(output, /alert|bad|<script|<svg|<iframe|<object|<embed|<form/i);
});

test('repairs malformed markup and strips attributes outside the allowlist', () => {
  const output = clean('<p class=x style="background:url(javascript:evil)" onerror=evil>One<b>Two<ul><li>Three</p><img src=x onerror=evil>');
  assert.ok(output.includes('One'));
  assert.ok(output.includes('Two'));
  assert.ok(output.includes('Three'));
  assert.doesNotMatch(output, /<img|onerror|class=|style=|javascript:/i);
  assert.equal(output, '<p>One<b>Two<ul><li>Three</li></ul></b></p>');
  assert.equal(clean(null), null);
  assert.equal(clean(''), null);
});
