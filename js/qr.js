/* ============================================================
   BusFlow · js/qr.js
   Deterministic QR-style matrix renderer.

   The prototype does not encode a real QR payload — it renders a
   stable, scannable-looking matrix derived from the pass ID so the
   same student always shows the same code. The production build
   will swap this for a real encoder; the scanning workflow and the
   payload format (BUSFLOW:<studentId>:<busId>) stay identical.
   ============================================================ */
(function (global) {
  "use strict";

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let s = seed || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  function matrix(text, n) {
    const size = n || 25;
    const rand = rng(hash(text));
    const grid = [];
    for (let y = 0; y < size; y++) {
      grid[y] = [];
      for (let x = 0; x < size; x++) grid[y][x] = rand() > 0.52 ? 1 : 0;
    }

    /* finder patterns (top-left, top-right, bottom-left) */
    function finder(ox, oy) {
      for (let y = -1; y < 8; y++) {
        for (let x = -1; x < 8; x++) {
          const gx = ox + x, gy = oy + y;
          if (gx < 0 || gy < 0 || gx >= size || gy >= size) continue;
          const edge = x === 0 || x === 6 || y === 0 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
          grid[gy][gx] = inside ? (edge || core ? 1 : 0) : 0;
        }
      }
    }
    finder(0, 0);
    finder(size - 7, 0);
    finder(0, size - 7);

    /* timing patterns */
    for (let i = 8; i < size - 8; i++) {
      grid[6][i] = i % 2 === 0 ? 1 : 0;
      grid[i][6] = i % 2 === 0 ? 1 : 0;
    }

    /* alignment block bottom-right */
    for (let y = size - 9; y < size - 4; y++) {
      for (let x = size - 9; x < size - 4; x++) {
        const edge = y === size - 9 || y === size - 5 || x === size - 9 || x === size - 5;
        const centre = y === size - 7 && x === size - 7;
        grid[y][x] = edge || centre ? 1 : 0;
      }
    }
    return grid;
  }

  /**
   * Returns an <svg> string for the given payload.
   * @param {string} text  payload, e.g. "BUSFLOW:GEHU2026-0117:BUS-07"
   * @param {object} opts  { cells, color, bg, className, quiet }
   */
  function svg(text, opts) {
    const o = Object.assign({ cells: 25, color: "#06070a", bg: "transparent", className: "h-full w-full", quiet: 2, radius: 0.9 }, opts || {});
    const grid = matrix(text, o.cells);
    const n = o.cells + o.quiet * 2;
    let rects = "";
    for (let y = 0; y < o.cells; y++) {
      for (let x = 0; x < o.cells; x++) {
        if (!grid[y][x]) continue;
        rects += '<rect x="' + (x + o.quiet) + '" y="' + (y + o.quiet) + '" width="1" height="1" rx="' + o.radius * 0.18 + '"/>';
      }
    }
    return '<svg viewBox="0 0 ' + n + " " + n + '" class="' + o.className +
      '" shape-rendering="crispEdges" role="img" aria-label="Digital bus pass QR code">' +
      (o.bg !== "transparent" ? '<rect width="' + n + '" height="' + n + '" fill="' + o.bg + '"/>' : "") +
      '<g fill="' + o.color + '">' + rects + "</g></svg>";
  }

  function payload(student) {
    return "BUSFLOW:" + student.id + ":" + student.busId + ":" + (student.validity || "");
  }

  global.BusFlow = global.BusFlow || {};
  global.BusFlow.QR = { svg: svg, matrix: matrix, payload: payload };
})(window);
