/* =========================================================
   charts.js — 轻量纯 SVG 图表（无外部依赖）
   ========================================================= */
const Charts = {
  /** 折线图 points:[{x:label, y:number}]  opts:{color, h, fill, unit, goal} */
  line(points, opts){
    opts = opts || {};
    const W = 640, H = opts.h || 180, P = { l: 38, r: 12, t: 14, b: 24 };
    if(!points || points.length === 0) return `<div class="empty">暂无数据</div>`;
    const ys = points.map(p => p.y);
    let min = Math.min.apply(null, ys), max = Math.max.apply(null, ys);
    if(opts.goal != null){ min = Math.min(min, opts.goal); max = Math.max(max, opts.goal); }
    if(min === max){ min -= 1; max += 1; }
    const pad = (max - min) * 0.15; min -= pad; max += pad;
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const X = i => P.l + (points.length === 1 ? iw/2 : iw * i / (points.length - 1));
    const Y = v => P.t + ih * (1 - (v - min) / (max - min));
    const color = opts.color || '#6366f1';
    const gid = 'lg' + Math.random().toString(36).slice(2,7);

    let d = '', area = '';
    points.forEach((p, i) => { d += (i ? ' L' : 'M') + X(i).toFixed(1) + ',' + Y(p.y).toFixed(1); });
    area = d + ` L${X(points.length-1).toFixed(1)},${P.t+ih} L${X(0).toFixed(1)},${P.t+ih} Z`;

    // y 轴 3 条网格
    let grid = '';
    for(let k = 0; k <= 2; k++){
      const v = min + (max - min) * k / 2, y = Y(v);
      grid += `<line x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}" stroke="#eef0f6" stroke-width="1"/>
               <text x="${P.l-6}" y="${(y+3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#98a0b5">${Math.round(v*10)/10}</text>`;
    }
    let goalLine = '';
    if(opts.goal != null){
      const gy = Y(opts.goal);
      goalLine = `<line x1="${P.l}" y1="${gy.toFixed(1)}" x2="${W-P.r}" y2="${gy.toFixed(1)}" stroke="#10b981" stroke-width="1.5" stroke-dasharray="5 4"/>
                  <text x="${W-P.r}" y="${(gy-5).toFixed(1)}" text-anchor="end" font-size="10" fill="#10b981" font-weight="600">目标 ${opts.goal}</text>`;
    }
    const step = Math.ceil(points.length / 6);
    let xlab = '';
    points.forEach((p, i) => {
      if(i % step === 0 || i === points.length-1)
        xlab += `<text x="${X(i).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="10" fill="#98a0b5">${U.esc(p.x)}</text>`;
    });
    const dots = points.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${points.length>25?2:3.2}" fill="#fff" stroke="${color}" stroke-width="2"><title>${U.esc(p.x)}: ${p.y}${opts.unit||''}</title></circle>`).join('');

    return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${color}" stop-opacity="0.22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
      </linearGradient></defs>
      ${grid}${goalLine}
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${xlab}
    </svg>`;
  },

  /** 柱状图 items:[{label, value, color?}] */
  bars(items, opts){
    opts = opts || {};
    if(!items.length) return `<div class="empty">暂无数据</div>`;
    const max = Math.max.apply(null, items.map(i=>i.value)) || 1;
    return `<div class="bars" style="${opts.h?`height:${opts.h}px`:''}">${items.map(it=>`
      <div class="b" title="${U.esc(it.label)}: ${it.value}">
        <i style="height:${Math.max(3, it.value/max*100)}%;${it.color?`background:${it.color}`:''}"></i>
        <span>${U.esc(it.label)}</span>
      </div>`).join('')}</div>`;
  },

  /** 分类占比条 items:[{label,value,color}] */
  breakdown(items, fmt){
    const total = items.reduce((s,i)=>s+i.value, 0) || 1;
    return items.map(it => `
      <div style="margin-bottom:11px">
        <div class="kv" style="padding:0 0 5px">
          <span>${U.esc(it.label)} <b style="color:var(--text-3);font-weight:500">${Math.round(it.value/total*100)}%</b></span>
          <b>${fmt ? fmt(it.value) : it.value}</b>
        </div>
        <div class="progress"><i style="width:${(it.value/total*100).toFixed(1)}%;background:${it.color}"></i></div>
      </div>`).join('');
  }
};
