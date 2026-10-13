/* AgentForge certificate renderer: draws the participant's name onto the template
   and exports PNG / PDF entirely in the browser. */
(function () {
  'use strict';

  // Template is 4800 x 3200 px. The name line sits at y ≈ 1944, spanning x ≈ 1207–3619.
  var CFG = {
    template: 'assets/template.jpg',
    width: 4800,
    height: 3200,
    centerX: 2413,
    baselineY: 1902,
    maxWidth: 2200,
    maxSize: 150,
    minSize: 84,
    font: function (px) { return '700 ' + px + 'px "Cinzel", Georgia, serif'; }
  };

  var templateImg = null;
  var templatePromise = null;

  function loadTemplate() {
    if (templatePromise) return templatePromise;
    templatePromise = new Promise(function (resolve, reject) {
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { templateImg = img; resolve(img); };
      img.onerror = function () { templatePromise = null; reject(new Error('Could not load certificate template')); };
      img.src = CFG.template;
    });
    return templatePromise;
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load(CFG.font(CFG.maxSize), 'Aa'),
    ]).catch(function () {});
  }

  // "nithya sree" -> "Nithya Sree"; keeps initials/caps like "A.Neelalohith" intact.
  function displayName(raw) {
    return String(raw || '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(function (w) {
        return w.replace(/(^|[.\-'])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); });
      })
      .join(' ');
  }

  function render(canvas, name) {
    return Promise.all([loadTemplate(), fontsReady()]).then(function () {
      canvas.width = CFG.width;
      canvas.height = CFG.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(templateImg, 0, 0, CFG.width, CFG.height);

      var text = displayName(name);
      var size = CFG.maxSize;
      ctx.font = CFG.font(size);
      while (ctx.measureText(text).width > CFG.maxWidth && size > CFG.minSize) {
        size -= 4;
        ctx.font = CFG.font(size);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Neon glow pass
      ctx.save();
      ctx.shadowColor = 'rgba(214, 70, 255, 0.85)';
      ctx.shadowBlur = 46;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(text, CFG.centerX, CFG.baselineY, CFG.maxWidth);
      ctx.restore();

      // Crisp face with a cool white-to-lilac gradient, like the AgentForge wordmark
      var g = ctx.createLinearGradient(0, CFG.baselineY - size, 0, CFG.baselineY);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.6, '#f1ecff');
      g.addColorStop(1, '#cfc3ff');
      ctx.fillStyle = g;
      ctx.fillText(text, CFG.centerX, CFG.baselineY, CFG.maxWidth);
      return canvas;
    });
  }

  function fileBase(p) {
    return 'AgentForge_Certificate_' + (p.r || 'participant');
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function downloadPNG(canvas, p) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        triggerDownload(blob, fileBase(p) + '.png');
        resolve();
      }, 'image/png');
    });
  }

  // Minimal single-page PDF that embeds the canvas as a JPEG (DCTDecode).
  function downloadPDF(canvas, p) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        blob.arrayBuffer().then(function (buf) {
          var jpg = new Uint8Array(buf);
          var W = 842, H = Math.round(842 * CFG.height / CFG.width * 100) / 100; // landscape, A4 width
          var enc = new TextEncoder();
          var parts = [];
          var offsets = [];
          var len = 0;
          function push(x) {
            var b = typeof x === 'string' ? enc.encode(x) : x;
            parts.push(b);
            len += b.length;
          }
          function obj(n, body) { offsets[n] = len; push(n + ' 0 obj\n' + body + '\nendobj\n'); }

          push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
          obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
          obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
          obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
          offsets[4] = len;
          push('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + CFG.width + ' /Height ' + CFG.height +
            ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n');
          push(jpg);
          push('\nendstream\nendobj\n');
          var content = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im0 Do Q';
          obj(5, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
          obj(6, '<< /Title (AgentForge Participation Certificate) /Producer (AgentForge Certificate Portal) >>');

          var xref = len;
          var x = 'xref\n0 7\n0000000000 65535 f \n';
          for (var i = 1; i <= 6; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
          push(x + 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF');

          triggerDownload(new Blob(parts, { type: 'application/pdf' }), fileBase(p) + '.pdf');
          resolve();
        });
      }, 'image/jpeg', 0.93);
    });
  }

  window.AFCert = {
    preload: loadTemplate,
    render: render,
    displayName: displayName,
    downloadPNG: downloadPNG,
    downloadPDF: downloadPDF
  };
})();
