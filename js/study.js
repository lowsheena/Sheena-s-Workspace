/* =========================================================
   study.js — 课表（可视化网格）/ 每课角落 / 作业论文 / 考试
   ========================================================= */
const Study = {
  title: '学业',
  tab: 'timetable',
  DAYS: ['周一','周二','周三','周四','周五','周六','周日'],
  COLORS: ['#6366f1','#ec4899','#14b8a6','#f59e0b','#8b5cf6','#3b82f6','#ef4444','#10b981','#f43f5e','#0ea5e9'],
  TYPES: [
    {k:'homework', l:'作业', i:'📝', c:'brand'},
    {k:'paper',    l:'论文', i:'📄', c:'violet'},
    {k:'ppt',      l:'PPT/展示', i:'📊', c:'amber'},
    {k:'reading',  l:'阅读', i:'📖', c:'teal'},
    {k:'quiz',     l:'小测', i:'✏️', c:'blue'},
    {k:'exam',     l:'考试', i:'🎯', c:'red'},
    {k:'project',  l:'项目', i:'🧩', c:'green'}
  ],

  /* ---- 浙大标准节次时间表（每节45分钟）---- */
  SLOTS: [
    {n:1, start:'08:00', end:'08:45'}, {n:2, start:'08:50', end:'09:35'},
    {n:3, start:'10:00', end:'10:45'}, {n:4, start:'10:50', end:'11:35'},
    {n:5, start:'11:40', end:'12:25'},
    {n:6, start:'13:25', end:'14:10'}, {n:7, start:'14:15', end:'15:00'},
    {n:8, start:'15:05', end:'15:50'},
    {n:9, start:'16:15', end:'17:00'}, {n:10, start:'17:05', end:'17:50'},
    {n:11, start:'18:50', end:'19:35'}, {n:12, start:'19:40', end:'20:25'},
    {n:13, start:'20:30', end:'21:15'}
  ],

  START_H: 8, END_H: 22, ROW: 48,

  type(k){ return this.TYPES.find(t=>t.k===k) || this.TYPES[0]; },
  course(id){ return Store.d.courses.find(c=>c.id===id); },
  courseTasks(id){ return Store.d.tasks.filter(t=>t.courseId===id); },
  pending(){ return Store.d.tasks.filter(t=>t.status!=='done'); },
  upcoming(n){
    return U.sortBy(this.pending().filter(t => t.due && U.fromToday(t.due) <= n), t=>t.due);
  },

  /** 把 slot 编号数组转成 start/end 时间 */
  slotsToTime(slots){
    if(!slots || !slots.length) return {start:'09:00',end:'10:00'};
    const first = this.SLOTS.find(s=>s.n === slots[0]);
    const last = this.SLOTS.find(s=>s.n === slots[slots.length-1]);
    return { start:first?first.start:'09:00', end:last?last.end:'10:00' };
  },

  /* ==================== 图片识别（三层引擎）====================
     Layer 1: TextDetector API（浏览器原生，iPhone Safari 零下载秒级）
     Layer 2: Tesseract.js（备选，本地中文 OCR）
     Layer 3: 手动输入兜底
  ==================== */

  /* 检测是否支持原生文字识别 API */
  _hasNativeDetector: (typeof window !== 'undefined' && 'TextDetector' in window),

  /* ---- 原生文字识别引擎（推荐，秒级、零下载、中文极准）---- */
  async recognizeNative(file, onProgress){
    const setP = (p, s)=>{ if(onProgress) onProgress(p, s); };
    if(!this._hasNativeDetector) throw new Error('NOT_SUPPORTED');
    setP(5, '加载图片…');
    const url = URL.createObjectURL(file);
    try{
      const img = await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=url; });
      setP(20, '识别中…');
      const detector = new TextDetector();
      const texts = await detector.detect(img);
      URL.revokeObjectURL(url);
      setP(100, '完成');
      return {
        raw: texts.map(t => t.rawValue).join('\n'),
        blocks: texts.map(t => ({
          text: t.rawValue,
          x: Math.round(t.boundingBox.x),
          y: Math.round(t.boundingBox.y),
          w: Math.round(t.boundingBox.width),
          h: Math.round(t.boundingBox.height)
        }))
      };
    }catch(e){ URL.revokeObjectURL(url); throw e; }
  },

  /* ---- Tesseract.js 备选引擎 ---- */
  _tessPromise:null,
  loadTesseract(){
    if(window.Tesseract) return Promise.resolve(window.Tesseract);
    if(this._tessPromise) return this._tessPromise;
    this._tessPromise = new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = 'https://fastly.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = ()=> resolve(window.Tesseract);
      s.onerror = ()=> reject(new Error('OCR 引擎加载失败'));
      document.head.appendChild(s);
    });
    return this._tessPromise;
  },

  _worker:null, _workerInit:null,
  getWorker(onLog){
    if(this._worker) return Promise.resolve(this._worker);
    if(this._workerInit) return this._workerInit;
    this._workerInit = (async ()=>{
      const Tesseract = await this.loadTesseract();
      const worker = await Tesseract.createWorker('chi_sim', 1, {
        workerPath: 'https://fastly.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        corePath: 'https://fastly.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-lstm.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
        gzip: true,
        logger: m => { if(onLog) onLog(m); }
      });
      this._worker = worker; this._workerInit = null;
      return worker;
    })();
    return this._workerInit;
  },

  async recognizeTesseract(file, onProgress){
    const setP = (p, s)=>{ if(onProgress) onProgress(p, s); };
    setP(2, '准备识别引擎…');
    const worker = await this.getWorker(m=>{
      const map = { 'loading tesseract core':[0,12], 'initializing tesseract':[12,22], 'loading language traineddata':[22,80], 'initializing api':[80,90] };
      const k = m && m.status;
      if(k && map[k]){ const [a,b]=map[k]; setP(a + (m.progress||0)*(b-a), '加载识别模型 '+(Math.round((m.progress||0)*100))+'%'); }
      else if(k === 'recognizing text'){ setP(90 + (m.progress||0)*10, '识别文字 '+(Math.round((m.progress||0)*100))+'%'); }
    });
    setP(92, '图像预处理…');
    const canvas = await this.preprocessImage(file);
    setP(95, '识别中…');
    const { data: { text } } = await worker.recognize(canvas, { preserve_interword_spaces: 1 });
    setP(100, '完成');
    return { raw: text, blocks: null }; // Tesseract 不返回位置信息
  },

  /* 图片预处理：缩图 + 灰度 + 对比度增强（表格专用）*/
  preprocessImage(file){
    return new Promise((resolve, reject)=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{
        try{
          const MAX = 1400; /* 表格需要更高分辨率保留网格线 */
          const oW = img.naturalWidth || img.width, oH = img.naturalHeight || img.height;
          const scale = Math.min(1, MAX / Math.max(oW, oH));
          const w = Math.max(1, Math.round(oW*scale)), h = Math.max(1, Math.round(oH*scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently:true });
          ctx.drawImage(img, 0, 0, w, h);
          const imgData = ctx.getImageData(0,0,w,h);
          const d = imgData.data;
          /* 灰度 */
          const gray = new Uint8ClampedArray(w*h);
          for(let i=0,p=0;i<d.length;i+=4,p++) gray[p] = (299*d[i] + 587*d[i+1] + 114*d[i+2])/1000;
          /* 自适应二值化 (Otsu) */
          const hist = new Int32Array(256);
          for(let i=0;i<gray.length;i++) hist[gray[i]]++;
          let total = gray.length, sum=0;
          for(let t=0;t<256;t++) sum += t*hist[t];
          let sumB=0, wB=0, maxVar=0, thr=127;
          for(let t=0;t<256;t++){
            wB += hist[t]; if(!wB) continue;
            const wF = total - wB; if(!wF) break;
            sumB += t*hist[t];
            const mB = sumB/wB, mF = (sum-sumB)/wF;
            const v = wB*wF*(mB-mF)*(mB-mB);
            if(v>maxVar){ maxVar=v; thr=t; }
          }
          /* 二值化 + 轻微膨胀连接断笔 */
          for(let i=0,p=0;i<d.length;i+=4,p++){
            const v = gray[p] >= thr ? 255 : 0;
            d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
          }
          ctx.putImageData(imgData, 0, 0);
          URL.revokeObjectURL(url);
          resolve(canvas);
        }catch(e){ URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
      img.src = url;
    });
  },

  /* 统一识别入口：自动选最佳引擎 */
  async recognizeTimetable(file, onProgress){
    /* 优先用原生 API（iPhone 秒级） */
    if(this._hasNativeDetector){
      try { return await this.recognizeNative(file, onProgress); }
      catch(e){ if(e.message !== 'NOT_SUPPORTED') console.warn('Native OCR failed:', e); }
    }
    /* 回退到 Tesseract */
    return await this.recognizeTesseract(file, onProgress);
  },

  /* ==================== 表格结构感知解析器 ====================
     核心思路：
     1. 如果有位置信息(blocks)，按坐标把文字归位到 13×7 的格子
     2. 每个格子内的文字解析为：课程名 / 老师 / 教室 / 周次
     3. 没有位置信息时，用正则从纯文本中提取
  ==================== */

  /** 主解析入口：返回 [{name, room, slotsText, day, teacher}] */
  parseTimetableResult(result){
    /* 有位置信息 → 表格结构解析（准确度高） */
    if(result.blocks && result.blocks.length > 0){
      return this.parseByGridPosition(result.blocks, result.raw);
    }
    /* 无位置信息 → 正则文本解析（备选） */
    return this.parseByText(result.raw);
  },

  /** 按网格位置解析：将带坐标的文字块映射到 13×7 课表格子 */
  parseByGridPosition(blocks, rawText){
    if(!blocks.length) return [];

    /* 第一步：计算图片边界和网格区域 */
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    blocks.forEach(b => {
      if(b.text.trim()){ minX=Math.min(minX,b.x); minY=Math.min(minY,b.y); maxX=Math.max(maxX,b.x+b.w); maxY=Math.max(maxY,b.y+b.h); }
    });
    const imgW = maxX - minX || 1, imgH = maxY - minY || 1;

    /* 第二步：检测表头行（找"星期一~星期日"或"时间"等关键词确定列区域）
       和左侧节次列（找数字 1-13 确定行区域） */
    const headerBlocks = blocks.filter(b => /星期|时间|单|双|早晨|上午|下午|晚上/.test(b.text));
    const slotBlocks = blocks.filter(b => /^[1-9]$|^1[0-3]$/.test(b.text.trim()));

    /* 根据检测到的表头/节次估算网格区域 */
    let gridTop = minY, gridLeft = minX, gridBottom = maxY, gridRight = maxX;
    
    if(headerBlocks.length > 0){
      /* 表头下方是数据区 */
      gridTop = Math.max(...headerBlocks.map(b => b.y + b.h)) + 2;
    }
    if(slotBlocks.length > 0){
      /* 节次右侧是数据区 */
      gridLeft = Math.max(...slotBlocks.map(b => b.x + b.w)) + 2;
    }

    const gridW = gridRight - gridLeft || imgW;
    const gridH = gridBottom - gridTop || imgH;

    /* 13 行 × 7 列的每个格子区域 */
    const cellW = gridW / 7;
    const cellH = gridH / 13;

    /* 第三步：把每个文字块分配到对应的格子 (day 1-7, slot 1-13) */
    const cells = {}; // key: "day_slot" → [text_blocks]
    blocks.forEach(b => {
      const txt = b.text.trim();
      if(!txt) return;
      
      /* 计算中心点相对于网格的坐标 */
      const cx = b.x + b.w/2 - gridLeft;
      const cy = b.y + b.h/2 - gridTop;

      /* 跳过表头区和节次列的文字 */
      if(cx < 0 || cy < 0 || cx > gridW || cy > gridH) return;

      const day = Math.min(7, Math.max(1, Math.floor(cx / cellW) + 1));
      const slot = Math.min(13, Math.max(1, Math.ceil(cy / cellH)));

      const key = day + '_' + slot;
      if(!cells[key]) cells[key] = [];
      cells[key].push({ ...b, txt });
    });

    /* 第四步：合并相邻同课程的格子（跨节次的课），解析每个单元格内容 */
    const results = [];
    const processedCells = new Set();

    Object.keys(cells).sort((a,b)=>{
      const [ad,as]=a.split('_').map(Number), [bd,bs]=b.split('_').map(Number);
      return ad!==bd ? ad-bd : as-bs;
    }).forEach(key => {
      if(processedCells.has(key)) return;
      const [day, slot] = key.split('_').map(Number);
      const cellTexts = cells[key];

      /* 合并同一门课占多个相邻格子的情况（向下合并） */
      let mergedTexts = [...cellTexts];
      let endSlot = slot;
      for(let nextS = slot+1; nextS <= 13; nextS++){
        const nextKey = day + '_' + nextS;
        if(!cells[nextKey]) break;
        /* 判断是否同一门课：文字高度跨越多格（高大的文本块）或者文字相同 */
        const hasTallBlock = cellTexts.some(b => b.h > cellH * 0.8);
        if(hasTallBlock){
          mergedTexts = mergedTexts.concat(cells[nextKey]);
          processedCells.add(nextKey);
          endSlot = nextS;
        } else { break; }
      }
      processedCells.add(key);

      /* 解析合并后的文字为结构化课程信息 */
      const parsed = this.parseCellText(mergedTexts.map(b=>b.txt).join(' '), day, slot, endSlot);
      if(parsed) results.push(parsed);
    });

    /* 如果位置解析结果太少，回退到文本正则 */
    if(results.length < 2){
      const textResults = this.parseByText(rawText);
      if(textResults.length > results.length) return textResults;
    }

    return results.slice(0, 30);
  },

  /** 解析单个格子的原始文字 → 结构化课程信息 */
  parseCellText(text, day, startSlot, endSlot){
    const raw = (text||'').trim();
    if(!raw || raw.length < 2) return null;

    /* 过滤掉明显的非课程文字 */
    if(/^(星期|时间|单|双|早晨|上午|下午|晚上|[1-9]|1[0-3])$/.test(raw)) return null;

    /* 提取教室（含地点关键词） */
    let room = '';
    const roomPatterns = [
      /(紫金港[^，。\s]{0,16}?\d[\-\d]{0,6})/,
      /(康民楼\s*\d[\-\d]{0,6})/,
      /([一-龥]{1,6}楼\s*\d[\-\d]{0,6})/,
      /(LT\d+)/,
      /(教\d+)/,
      /([A-Z]\d{2,4}[A-Z]?)/i,
      /(实验室[^，。\s]{0,10})/
    ];
    for(const rp of roomPatterns){
      const m = raw.match(rp);
      if(m){ room = m[0].trim(); break; }
    }

    /* 提取老师名字（通常在"秋(周)"后面、"教室"前面） */
    let teacher = '';
    const teacherM = raw.match(/\/\s*([一-龥]{1,4})(?:\/|$|\s)/);
    if(teacherM && !/(紫金港|楼|校区|教室|实验)/.test(teacherM[1])){
      teacher = teacherM[1];
    }

    /* 清理掉教室、周次、时间等信息后，剩余的主要文字就是课程名 */
    let name = raw;
    /* 去掉教室 */
    if(room) name = name.replace(room, '');
    /* 去掉周次模式如 "秋(周)1-8(单/周)" 或 "2026年11月08日" 等 */
    name = name.replace(/秋\(周\)[\d\-（单双周）]+/g, '');
    name = name.replace(/\d{4}年?\d{1,2}月?\d{1,2}日?[\(（][^\)）]*[\)）]/g, '');
    name = name.replace(/\d{2}:\d{2}[-–~]\d{2}:\d{2}/g, '');
    name = name.replace(/[\d:]+[-–~][\d:]*/g, '');
    /* 去掉斜杠分隔的多余信息 */
    name = name.replace(/\/+/g, ' ');
    /* 去掉括号里的补充信息但保留有意义的 */
    name = name.replace(/[（(][^）)]{0,30}[）)]/g, '');
    /* 清理多余空白和标点 */
    name = name.replace(/[\s,，。、|\\\/]+/g, ' ').trim();
    /* 过滤掉纯数字或太短的 */
    if(name.length < 2 || /^\d+$/.test(name)) name = '';

    /* 如果没提取到课程名，用原始文字的前面部分 */
    if(!name){
      const parts = raw.split(/[\s\/,，、]+/).filter(p => p.length >= 2 && !/^\d/.test(p) && !/(紫金港|楼|校区|秋\(周\)|\d{4}年)/.test(p));
      name = parts[0] || raw.split(/[\s\/,，]/)[0] || '';
    }

    if(!name || name.length < 2) return null;

    const slotsText = startSlot !== endSlot ? (startSlot+'-'+endSlot) : String(startSlot);

    return { name:name.trim(), room, slotsText, day, teacher:teacher.trim() };
  },

  /** 纯文本正则解析（没有位置信息时的备选方案） */
  parseByText(raw){
    const text = String(raw||'');
    const stopWords = /^(星期|周|第|节|上课|下课|时间|课程|姓名|学号|学期|学年|教务|研究生|本科生|校区|教室|教师|班级|备注|教学楼|节次|一二三四五六日|上午|下午|晚上|周次|单周|双周|全周|专业|培养|计划|方案|学院|大学|学生|信息|选课|列表|名称|代码|学分|总评|成绩|考核|教学|安排|说明|提示|注意|查看|打印|导出|早晨|刘显廷)$/;
    const locKw = /(紫金港|楼|校区|教室|实验室|馆|中心|康|民楼)/;
    const results = [], seen = new Set();

    /* 按行分割，每行尝试解析一条课程记录 */
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    
    /* 先尝试匹配 "课程名 周X 第X-X节 教室" 格式的整行 */
    for(const line of lines){
      const trimmed = line.trim();
      if(trimmed.length < 4) continue;

      /* 尝试完整行匹配 */
      const dayMatch = trimmed.match(/周(?:一|二|三|四|五|六|日|期[一二三四五六日])/);
      const day = dayMatch ? ({一:1,二:2,三:3,四:4,五:5,六:6,日:7}[dayMatch[1].replace('期','')] || 0) : 0;
      const slotMatch = trimmed.match(/(\d{1,2})\s*[-~－—至到]\s*(\d{1,2})\s*节/);
      const slotsText = slotMatch ? (slotMatch[1]+'-'+slotMatch[2]) : '';
      
      /* 找教室 */
      let room = '';
      const roomM = trimmed.match(/(紫金港[^，。\n]{0,14})|(LT\d+)|([一-龥]{1,4}楼\s*\d{1,3}(?:[-\s]\d{1,3})?)|（[^）]{0,16}）/);
      if(roomM) room = roomM[0].replace(/\s+/g,' ').trim();

      /* 提取课程名（去掉已知字段后最长的中文片段） */
      let rest = trimmed;
      if(dayMatch) rest = rest.replace(dayMatch[0],'');
      if(slotMatch) rest = rest.replace(slotMatch[0],'');
      if(room) rest = rest.replace(room,'');
      rest = rest.replace(/秋\(周\)[\d\-（）单双周]+/g,'').replace(/\d{4}年.*?[\)）]/g,'').replace(/\/+/g,' ').trim();
      
      const candidates = rest.match(/[一-龥]{2,12}/g) || [];
      const name = (candidates.find(n => !stopWords.test(n) && !locKw.test(n)) || candidates[0] || '').trim();
      
      if(name && name.length >= 2){
        const sig = name+'|'+day+'|'+slotsText+'|'+room;
        if(!seen.has(sig)){ seen.add(sig); results.push({ name, room, slotsText, day }); }
      }
    }

    /* 如果按行解析结果不够，做全文扫描 */
    if(results.length < 3){
      const re = /[一-龥]{2,10}/g; let m;
      while((m = re.exec(text))){
        const w = m[0];
        if(stopWords.test(w) || locKw.test(w) || /[0-9]/.test(w)) continue;
        const around = text.slice(Math.max(0,m.index-50), m.index+70);
        const rm = around.match(/(紫金港[^，。\n]{0,12}?\d[\d-]{0,6})|(LT\d+)|([一-龥]*楼\s*\d{1,3})/);
        const rRoom = rm ? rm[0].replace(/\s+/g,'').trim() : '';
        const pm = around.match(/(\d{1,2})\s*[-~－]\s*(\d{1,2})\s*节/);
        const rSlots = pm ? (pm[1]+'-'+pm[2]) : '';
        const dm = around.match(/周\s*([一二三四五六日天])/);
        const rDay = dm ? ({一:1,二:2,三:3,四:4,五:5,六:6,日:7,天:7}[dm[1]]) : 0;
        const sig = w+'|'+rDay+'|'+rSlots+'|'+rRoom;
        if(seen.has(sig) || w.length<2) continue; seen.add(sig);
        results.push({ name:w, room:rRoom, slotsText:rSlots, day:rDay });
      }
    }

    return results.slice(0, 30);
  },

  /* 兼容旧接口 */
  parseAny(text){
    return this.parseByText(text);
  },
  _slotsToText(start, end){
    const s = this.SLOTS.find(s=>s.start===start), e = this.SLOTS.find(s=>s.end===end);
    if(s && e) return s.n + (s.n!==e.n ? '-'+e.n : '');
    return '';
  },

  /* ==================== 可视化网格编辑器 ==================== */

  editCourse(id){
    const c = id ? this.course(id) : null;
    const editing = c ? JSON.parse(JSON.stringify(c)) : { name:'', teacher:'', room:'', color:this.COLORS[(Store.d.courses.length||0)%10], note:'', slots:[] };

    UI.form({
      title: id ? '编辑课程' : '添加课程',
      wide:true,
      fields:[
        { key:'name', label:'课程名称', type:'text', value:editing.name, required:true, placeholder:'例：广告摄影' },
        { key:'teacher', label:'老师', type:'text', value:editing.teacher, half:true },
        { key:'room', label:'教室', type:'text', value:editing.room, half:true, placeholder:'例：紫金港北 3-518' },
        { key:'color', label:'颜色标记', type:'opts', value:editing.color, options:this.COLORS.map(x=>({v:x,l:'●'})) },
        { key:'note', label:'备注', type:'text', value:editing.note, placeholder:'课程代码 / 学分 / 英文名' }
      ],
      extraHTML:`
        <div class="field" style="margin-top:4px">
          <label>选择上课时间 <small style="color:var(--text-3);font-weight:400">（点击或拖动选择时间段）</small></label>
          <div id="gridEditor" style="margin-top:8px"></div>
          <div id="selectedSlots" style="margin-top:8px;font-size:13px;color:var(--text-2)"></div>
        </div>`,
      onMount(r){
        const gridEl = r.querySelector('#gridEditor');
        const selEl = r.querySelector('#selectedSlots');
        let selected = {};

        (editing.slots||[]).forEach(s => {
          const day = s.day || 1;
          const sMin = U.str2min(s.start), eMin = U.str2min(s.end);
          Study.SLOTS.forEach(slot => {
            const slMin = U.str2min(slot.start);
            if(slMin >= sMin && slMin <= eMin) selected[day+'_'+slot.n] = true;
          });
        });

        function renderGrid(){
          gridEl.innerHTML = `
            <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
              <table class="tt-grid" style="min-width:100%;border-collapse:collapse;font-size:12.5px">
                <thead><tr>
                  <th style="padding:6px 4px;color:var(--text-3);font-weight:500;width:44px;border-bottom:2px solid var(--line)">节</th>
                  ${Study.DAYS.map(d => `<th style="padding:6px 4px;color:var(--text-3);font-weight:500;border-bottom:2px solid var(--line);min-width:52px">${d}</th>`).join('')}
                </tr></thead>
                <tbody>${Study.SLOTS.map(slot => `<tr>
                  <td style="padding:5px 4px;text-align:center;color:var(--text-3);border-bottom:1px solid var(--line-soft);font-size:11px;white-space:nowrap">
                    <b>${slot.n}</b><br><span style="color:var(--text-3);font-size:10px">${slot.start.slice(0,5)}</span>
                  </td>
                  ${Study.DAYS.map((_, di) => {
                    const key = (di+1)+'_'+slot.n;
                    const on = !!selected[key];
                    return `<td data-cell="${key}" class="${on?'on':''}" style="padding:0;border-bottom:1px solid var(--line-soft);cursor:pointer;text-align:center;vertical-align:middle">
                      <div style="width:100%;height:28px;${on?'background:'+editing.color+';border-radius:5px;':'background:transparent;'}transition:background .15s"
                        ${on?'title="'+editing.name+'"':''}></div>
                    </td>`;
                  }).join('')}
                </tr>`).join('')}</tbody>
              </table>
            </div>`;
          gridEl.querySelectorAll('[data-cell]').forEach(td => {
            td.addEventListener('click', () => {
              const k = td.dataset.cell;
              selected[k] = !selected[k];
              renderGrid();
              updateSelText();
            });
          });
        }

        function updateSelText(){
          const byDay = {};
          Object.keys(selected).filter(k => selected[k]).forEach(k => {
            const [d,s] = k.split('_').map(Number);
            if(!byDay[d]) byDay[d] = [];
            byDay[d].push(s);
          });
          const parts = [];
          Object.keys(byDay).sort((a,b)=>a-b).forEach(d => {
            const slts = byDay[d].sort((a,b)=>a-b);
            parts.push(Study.DAYS[d-1]+' 第'+slts.join(',')+'节');
          });
          selEl.innerHTML = parts.length ? '<b>'+parts.join('、')+'</b>' : '<span style="color:var(--text-3)">点击上方网格选择上课时间</span>';
        }

        renderGrid(); updateSelText();

        r._getSelectedSlots = () => {
          const byDay = {};
          Object.keys(selected).filter(k => selected[k]).forEach(k => {
            const [d,s] = k.split('_').map(Number);
            if(!byDay[d]) byDay[d] = [];
            byDay[d].push(s);
          });
          const out = [];
          Object.keys(byDay).sort((a,b)=>a-b).forEach(d => {
            const slts = byDay[d].sort((a,b)=>a-b);
            const timeInfo = Study.slotsToTime(slts);
            out.push({ day:+d, start:timeInfo.start, end:timeInfo.end });
          });
          return out;
        };
      },
      onSubmit(st, r){
        // 直接读取网格维护的选中状态（onMount 闭包维护，避免不同浏览器对 style.background
        // 序列化差异（如透明背景会返回 rgba(0,0,0,0) 而非 'transparent'）导致误判选中）
        let finalSlots = [];
        if(r && typeof r._getSelectedSlots === 'function') finalSlots = r._getSelectedSlots();
        // 兜底：_getSelectedSlots 不可用时，改读格子上的 .on class（renderGrid 已标记）
        if(!finalSlots || !finalSlots.length){
          const root = r || document;
          const cells = root.querySelectorAll('#gridEditor [data-cell]');
          const sel = {};
          cells.forEach(td => { if(td.classList.contains('on')) sel[td.dataset.cell] = true; });
          const byDay = {};
          Object.keys(sel).forEach(k => { const [d,s] = k.split('_').map(Number); if(!byDay[d]) byDay[d] = []; byDay[d].push(s); });
          Object.keys(byDay).sort((a,b)=>a-b).forEach(d => {
            const slts = byDay[d].sort((a,b)=>a-b);
            const ti = Study.slotsToTime(slts);
            finalSlots.push({ day:+d, start:ti.start, end:ti.end });
          });
        }
        if(!finalSlots.length) finalSlots.push({ day:1, start:'09:00', end:'10:30' });
        const data = { name:st.name, teacher:st.teacher||'', room:st.room||'', color:st.color, note:st.note||'', slots:finalSlots };
        if(id) Store.update('courses', id, data); else Store.add('courses', data);
        UI.toast(id?'已更新':'课程已添加'); App.refresh();
      }
    });
  },

  /* -------- 拍照识别课表（智能识别 + 确认）-------- */
  importTimetable(){
    UI.modal({
      title:'拍照识别课表', wide:true, okText:null,
      bodyHTML:`
        <div class="field">
          <label>① 拍下 / 上传你的课表照片</label>
          <div class="photo-field">
            <label class="photo-btn">📷 拍照 / 选择图片<input type="file" accept="image/*" id="ttFile" style="display:none"></label>
          </div>
          <div id="ttEngine" style="margin-top:8px;font-size:12px;color:var(--text-3)">
            ${this._hasNativeDetector 
              ? '<span class="chip green">✅ 将使用手机原生的文字识别（秒级、离线、精准）</span>' 
              : '<span class="chip amber">⚠️ 将使用备用识别引擎（首次需下载模型约 10MB）</span>'}
          </div>
          <div id="ttStatus" style="margin-top:6px;font-size:13px;color:var(--text-3)"></div>
          <div id="ttPrev" style="margin-top:10px"></div>
        </div>
        <div class="field" style="margin-top:6px">
          <label>② 识别结果（可手动修正后点「确认导入」）</label>
          <div id="ttResult"></div>
        </div>`,
      onMount(r){
        const fileInput = r.querySelector('#ttFile');
        const status = r.querySelector('#ttStatus');
        const prev = r.querySelector('#ttPrev');
        const resultBox = r.querySelector('#ttResult');
        let lastFile = null;

        async function doOcr(){
          if(!lastFile) return;
          status.textContent = '正在识别…';
          prev.innerHTML = `<img class="thumb" style="width:100%;max-height:340px;object-fit:contain;border-radius:12px;border:1px solid var(--line)" src="${URL.createObjectURL(lastFile)}">`;
          try{
            const result = await Study.recognizeTimetable(lastFile, (p, s)=>{ 
              status.textContent = (s||'识别中…')+' '+Math.round(p)+'%'; 
            });
            
            /* 解析识别结果 */
            const rows = Study.parseTimetableResult(result);
            
            if(rows.length === 0){
              resultBox.innerHTML = `<div class="alert amber"><div class="a-ico">⚠️</div><div class="a-body"><div class="a-t">没认出课程</div><div class="a-s">可以试试：<br>① 拍更清晰的课表截图<br>② 用「添加课程」手动录入</div></div></div>`;
              status.textContent = '✅ 识别完成，但未找到课程信息';
              return;
            }

            status.textContent = '✅ 识别到 '+rows.length+' 门课程，请核对后导入';
            
            /* 显示确认列表 */
            resultBox.innerHTML = `
              <div class="alert green"><div class="a-ico">✅</div><div class="a-body"><div class="a-t">识别到 ${rows.length} 条课程，请确认或微调</div><div class="a-s">不勾选的不导入；信息不对可以直接改。</div></div></div>
              <div id="verifyList">${rows.map((rw,i)=>`
                <div class="verify-row" data-i="${i}" style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line-soft);flex-wrap:wrap">
                  <input type="checkbox" class="v-inc" data-i="${i}" checked style="width:18px;height:18px;flex:none">
                  <input class="inp v-name" data-i="${i}" value="${U.esc(rw.name)}" style="flex:1;min-width:120px" placeholder="课程名">
                  <select class="inp v-day" data-i="${i}" style="width:92px;flex:none">
                    <option value="0" ${!rw.day?'selected':''}>未识别</option>
                    ${Study.DAYS.map((d,di)=>`<option value="${di+1}" ${rw.day===(di+1)?'selected':''}>${d}</option>`).join('')}
                  </select>
                  <input class="inp v-slots" data-i="${i}" value="${U.esc(rw.slotsText||'')}" style="width:108px;flex:none" placeholder="如 1-2">
                  <input class="inp v-room" data-i="${i}" value="${U.esc(rw.room||'')}" style="width:130px;flex:none" placeholder="教室">
                </div>`).join('')}</div>
              <button class="btn btn-primary btn-block" id="confirmImport" style="margin-top:12px">✅ 确认导入（保留已有课程）</button>`;

            /* 保存原图 */
            try{
              const data = await Photos.compress(lastFile, 1600, .85);
              const pid = U.uid(); await Photos.put(pid, data);
              if(Store.d.settings.ttPhoto) Photos.del(Store.d.settings.ttPhoto);
              Store.d.settings.ttPhoto = pid; Store.save();
            }catch(e){}

            /* 绑定确认按钮 */
            r.querySelector('#confirmImport').addEventListener('click', ()=>{
              const rows2 = [];
              resultBox.querySelectorAll('.verify-row').forEach(row=>{
                if(!row.querySelector('.v-inc').checked) return;
                const name = row.querySelector('.v-name').value.trim();
                const day = +row.querySelector('.v-day').value;
                const slotsText = row.querySelector('.v-slots').value.trim();
                const room = row.querySelector('.v-room').value.trim();
                if(!name) return;
                let slots = [];
                const mm = slotsText.match(/(\d+)\s*[-~－]\s*(\d+)/);
                if(mm && day>0){ const a=+mm[1], b=+mm[2]; const sSlot=Study.SLOTS.find(s=>s.n===a), eSlot=Study.SLOTS.find(s=>s.n===b); if(sSlot&&eSlot) slots.push({day, start:sSlot.start, end:eSlot.end}); }
                if(!slots.length && day>0) slots = [{day, start:'09:00', end:'10:00'}];
                if(slots.length) rows2.push({name, room, slots});
              });
              rows2.forEach(rw=>{
                const exist = Store.d.courses.find(c=>c.name===rw.name);
                if(exist){ rw.slots.forEach(s=>{ if(!exist.slots.find(x=>x.day===s.day&&x.start===s.start)) exist.slots.push(s); }); if(rw.room&&!exist.room) exist.room=rw.room; }
                else Store.add('courses', { name:rw.name, teacher:'', room:rw.room, note:'', color:Study.COLORS[Store.d.courses.length%10], slots:rw.slots });
              });
              Store.save();
              UI.toast('已导入 '+rows2.length+' 门课程');
              UI.closeModal(); App.refresh();
            });

          }catch(err){
            console.error(err);
            status.innerHTML = '⚠️ 识别失败：'+err.message+'。<br>你可以用「添加课程」手动录入。';
            resultBox.innerHTML = '';
          }
        }

        fileInput.addEventListener('change', async e=>{ const f = e.target.files[0]; if(!f) return; lastFile = f; doOcr(); });
        
        /* 预热引擎 */
        if(!this._hasNativeDetector) this.getWorker();
      }
    });
  },

  /* ---------------- 作业 / 考试 ---------------- */
  addTask(courseId, presetType){
    const cs = Store.d.courses;
    UI.form({
      title: presetType === 'exam' ? '添加考试' : '添加作业 / 论文',
      fields:[
        { key:'title', label:'标题', type:'text', value:'', required:true, placeholder: presetType==='exam'?'例：期中考试':'例：Essay 第二稿 2000字' },
        { key:'type', label:'类型', type:'opts', value:presetType||'homework', options:this.TYPES.map(t=>({v:t.k,l:t.i+' '+t.l})) },
        { key:'courseId', label:'所属课程', type:'select', value:courseId||(cs[0]&&cs[0].id)||'',
          options:[{v:'',l:'（不关联课程）'}].concat(cs.map(c=>({v:c.id,l:c.name}))) },
        { key:'due', label:'截止 / 考试日期', type:'date', value:U.today(), required:true, half:true },
        { key:'time', label:'时间', type:'time', value:'', half:true },
        { key:'priority', label:'重要程度', type:'opts', value:'normal',
          options:[{v:'low',l:'一般'},{v:'normal',l:'重要'},{v:'high',l:'🔥 非常重要'}] },
        { key:'note', label:'要求 / 备注', type:'textarea', value:'', placeholder:'字数、格式、提交平台、考试范围…' },
        { key:'photo', label:'题目截图（可选）', type:'photo', value:'' }
      ],
      onSubmit(st){
        Store.add('tasks', { courseId:st.courseId||'', title:st.title, type:st.type, due:st.due, time:st.time||'',
          priority:st.priority, note:st.note||'', photo:st.photo||'', status:'todo', created:U.today() });
        UI.toast('已添加'); App.refresh();
      }
    });
  },
  toggleTask(id){
    const t = Store.get('tasks', id); if(!t) return;
    Store.update('tasks', id, { status: t.status==='done'?'todo':'done', doneAt: t.status==='done'?'':U.today() });
    if(t.status !== 'done') UI.toast('搞定一个 ✅');
    App.refresh();
  },

  /* ---------------- 课程角落 ---------------- */
  openCourse(id){
    const c = this.course(id); if(!c) return;
    const ts = U.sortBy(this.courseTasks(id), t=>(t.status==='done'?'z':'a')+t.due);
    const pend = ts.filter(t=>t.status!=='done');
    UI.sheet({
      title: c.name,
      sub: `${c.teacher?U.esc(c.teacher)+' · ':''}${c.room?U.esc(c.room)+' · ':''}${(c.slots||[]).map(s=>this.DAYS[s.day-1]+' '+s.start).join('、')}`,
      bodyHTML:`
        <div class="card" style="margin-bottom:14px;border-left:4px solid ${c.color}">
          <div class="grid g3" style="gap:10px;text-align:center">
            <div class="stat" style="align-items:center"><b>${pend.length}</b><span>待完成</span></div>
            <div class="stat" style="align-items:center"><b>${ts.filter(t=>t.status==='done').length}</b><span>已完成</span></div>
            <div class="stat" style="align-items:center"><b>${ts.filter(t=>t.type==='exam'&&t.status!=='done').length}</b><span>待考试</span></div>
          </div>
          ${c.note?`<div class="hint" style="margin-top:12px">${U.esc(c.note)}</div>`:''}
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn btn-primary btn-sm" style="flex:1" data-newtask="homework">＋ 作业/论文</button>
            <button class="btn btn-ghost btn-sm" style="flex:1" data-newtask="exam">＋ 考试</button>
            <button class="btn btn-ghost btn-sm" data-editc="1">编辑</button>
          </div>
        </div>
        <div class="sec-title"><h2 style="font-size:15px">这门课的角落</h2></div>
        ${ts.length ? `<div class="list">${ts.map(t=>Study.taskHTML(t, false)).join('')}</div>` : UI.empty('还没有作业记录，点上面按钮添加','🗂️')}
        <button class="btn btn-danger btn-block btn-sm" data-delc="1" style="margin-top:22px">删除这门课程</button>`,
      onMount(r){
        r.querySelectorAll('[data-newtask]').forEach(b=>b.addEventListener('click',()=>{ UI.closeSheet(); Study.addTask(id, b.dataset.newtask); }));
        r.querySelector('[data-editc]').addEventListener('click', ()=>{ UI.closeSheet(); Study.editCourse(id); });
        r.querySelector('[data-delc]').addEventListener('click', ()=>{
          UI.confirm('删除课程「'+c.name+'」？相关作业会一并删除。', ()=>{
            Store.d.tasks = Store.d.tasks.filter(t=>t.courseId!==id);
            Store.remove('courses', id); UI.closeSheet(); App.refresh();
          }, true);
        });
        r.addEventListener('click', e=>{
          const tk = e.target.closest('[data-tick]'); if(tk){ Study.toggleTask(tk.dataset.tick); UI.closeSheet(); setTimeout(()=>Study.openCourse(id), 60); return; }
          const dl = e.target.closest('[data-deltask]'); if(dl){ UI.confirm('删除该条目？', ()=>{ Store.remove('tasks', dl.dataset.deltask); UI.closeSheet(); App.refresh(); setTimeout(()=>Study.openCourse(id),60); }, true); }
        });
      }
    });
  },

  taskHTML(t, showCourse){
    const ty = this.type(t.type);
    const c = t.courseId ? this.course(t.courseId) : null;
    const n = t.due ? U.fromToday(t.due) : 999;
    const urgent = t.status!=='done' && n <= 1;
    const soon = t.status!=='done' && n <= 3;
    return `<div class="task-item ${t.status==='done'?'done':''}">
      <button class="tick ${t.status==='done'?'on':''}" data-tick="${t.id}">${t.status==='done'?'✓':''}</button>
      <div class="r-main">
        <div class="t-title">${t.priority==='high'?'🔥 ':''}${U.esc(t.title)}</div>
        <div class="t-meta">
          <span class="chip ${ty.c}">${ty.i} ${ty.l}</span>
          ${showCourse && c ? `<span class="chip" style="background:${c.color}1a;color:${c.color}">${U.esc(c.name)}</span>` : ''}
          ${t.due ? `<span style="color:${t.status==='done'?'var(--text-3)':urgent?'var(--red)':soon?'var(--amber)':'var(--text-3)'};font-weight:${urgent?700:500}">${U.relDate(t.due)}${t.time?' '+t.time:''}</span>` : ''}
        </div>
        ${t.note?`<div style="font-size:12.5px;color:var(--text-2);margin-top:6px;white-space:pre-wrap">${U.esc(t.note)}</div>`:''}
        ${t.photo?`<img class="thumb" style="margin-top:8px;width:66px;height:66px" data-photo="${t.photo}" src="">`:''}
      </div>
      <button class="mini-btn" data-deltask="${t.id}">✕</button>
    </div>`;
  },

  /* ==================== 页面渲染 ==================== */
  render(el){
    el.innerHTML = `
      <div class="seg" id="sTab" style="margin-bottom:16px">
        ${[['timetable','课表'],['tasks','作业'],['exams','考试']].map(([k,l])=>{
          const n = k==='tasks' ? this.pending().filter(t=>t.type!=='exam').length : k==='exams' ? this.pending().filter(t=>t.type==='exam').length : 0;
          return `<button data-t="${k}" class="${this.tab===k?'on':''}">${l}${n?` <b style="color:var(--red)">${n}</b>`:''}</button>`;
        }).join('')}
      </div>
      <div id="sBody"></div>`;
    el.querySelector('#sTab').addEventListener('click', e=>{ const b = e.target.closest('[data-t]'); if(!b) return; this.tab = b.dataset.t; this.render(el); });
    const body = el.querySelector('#sBody');
    ({ timetable:()=>this.renderTT(body), tasks:()=>this.renderTasks(body), exams:()=>this.renderExams(body) })[this.tab]();
    Photos.hydrate(el);
  },

  renderTT(el){
    const cs = Store.d.courses;
    const todayIdx = (new Date().getDay() + 6) % 7;
    const now = new Date(); const nowMin = now.getHours()*60 + now.getMinutes();

    el.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="addCourse">＋ 添加课程</button>
        <button class="btn btn-soft btn-sm" id="impPhoto" style="background:#ede9fe;color:#7c3aed;border-color:#c4b5fd">📷 拍照识别课表</button>
        ${Store.d.settings.ttPhoto?`<button class="btn btn-ghost btn-sm" id="viewTT">查看课表原图</button>`:''}
      </div>

      ${cs.length ? `
        <!-- 可视化周课表网格 -->
        <div class="card pad-s" style="margin-bottom:16px;padding:0;overflow:hidden">
          <div class="tt-wrap" style="border:none">
            <div class="tt2">
              <div class="tt2-head">
                <div class="tt2-th"></div>
                ${this.DAYS.map((d,i)=>{ const dd = new Date(); dd.setDate(dd.getDate() - todayIdx + i);
                  return `<div class="tt2-dh ${i===todayIdx?'today':''}">${d}<small>${dd.getMonth()+1}/${dd.getDate()}</small></div>`; }).join('')}
              </div>
              <div class="tt2-body">
                <div class="tt2-times">${this.SLOTS.map(s => `<div class="tt2-hour"><b>${s.n}</b><small>${s.start.slice(0,5)}</small></div>`).join('')}</div>
                ${Array.from({length:7}, (_,di)=>{
                  const dayCourses = [];
                  cs.forEach(c => (c.slots||[]).forEach(s => {
                    if((s.day||1)-1 === di) dayCourses.push({c, s});
                  }));
                  const isToday = di === todayIdx;
                  return `<div class="tt2-col ${isToday?'today':''}" style="height:${this.SLOTS.length * 32}px">
                    ${isToday ? (() => {
                      const curSlot = this.SLOTS.findIndex(s => {
                        const sMin = U.str2min(s.start), eMin = U.str2min(s.end);
                        return nowMin >= sMin && nowMin <= eMin;
                      });
                      if(curSlot >= 0) return `<div class="tt-now" style="top:${curSlot*32}px;height:32px"></div>`;
                      const nextSlot = this.SLOTS.findIndex(s => U.str2min(s.start) > nowMin);
                      if(nextSlot >= 0) return `<div style="position:absolute;top:${nextSlot*32}px;left:-2px;right:-2px;height:2px;background:var(--brand);opacity:.5;border-radius:1px"></div>`;
                      return '';
                    })() : ''}
                    ${dayCourses.map(({c,s}) => {
                      const si = this.SLOTS.findIndex(sl => sl.start === s.start);
                      const ei = this.SLOTS.findIndex(sl => sl.end === s.end);
                      const top = (si >= 0 ? si : 0) * 32;
                      const h = Math.max(28, ((ei >= 0 ? ei : si+1) - (si >= 0 ? si : 0)) * 32 - 3);
                      const pend = this.courseTasks(c.id).filter(t=>t.status!=='done').length;
                      return `<div class="tt-ev" data-course="${c.id}" style="top:${Math.max(0,top)}px;height:${h}px;background:${c.color}1a;border-color:${c.color};color:${c.color}">
                        <b>${U.esc(c.name)}</b><i>${s.start}-${s.end}${c.room?' · '+U.esc(c.room):''}</i>
                        ${pend?`<span class="dot"></span>`:''}
                      </div>`;
                    }).join('')}
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="sec-title"><h2>我的课程 <span style="font-size:13px;color:var(--text-3);font-weight:500">${cs.length} 门</span></h2></div>
      ${cs.length ? `<div class="grid g3">${cs.map(c=>{
        const ts = this.courseTasks(c.id), pend = ts.filter(t=>t.status!=='done');
        const nextEx = U.sortBy(pend.filter(t=>t.type==='exam'), t=>t.due)[0];
        return `<div class="course-card" data-course="${c.id}" style="border-left-color:${c.color}">
          <div class="cc-top">
            <div><div class="cc-name">${U.esc(c.name)}</div>
              <div class="cc-meta">${(c.slots||[]).map(s=>this.DAYS[s.day-1]+' '+s.start).join(' / ') || '未设置时间'}</div>
              <div class="cc-meta">${c.teacher?U.esc(c.teacher):''}${c.room?' · '+U.esc(c.room):''}</div></div>
          </div>
          <div class="cc-stats">
            <span class="chip ${pend.length?'amber':'green'}">${pend.length?pend.length+' 项待办':'全部完成'}</span>
            ${nextEx?`<span class="chip red">考试 ${U.relDate(nextEx.due)}</span>`:''}
          </div>
        </div>`;}).join('')}</div>`
      : `<div class="card">${UI.empty('还没有课程，点「📷 拍照识别课表」自动识别，或「添加课程」手动录入','📚')}</div>`}`;

    el.querySelector('#addCourse').addEventListener('click', ()=>this.editCourse());
    el.querySelector('#impPhoto').addEventListener('click', ()=>this.importTimetable());
    const v = el.querySelector('#viewTT');
    if(v) v.addEventListener('click', async ()=>{ const d = await Photos.get(Store.d.settings.ttPhoto); if(d) UI.viewImage(d); });
    el.addEventListener('click', e=>{ const b = e.target.closest('[data-course]'); if(b) this.openCourse(b.dataset.course); });
  },

  renderTasks(el){
    const all = U.sortBy(Store.d.tasks.filter(t=>t.type!=='exam'), t=>t.due);
    const pend = all.filter(t=>t.status!=='done');
    const overdue = pend.filter(t=>U.fromToday(t.due) < 0);
    const week = pend.filter(t=>{ const n = U.fromToday(t.due); return n>=0 && n<=7; });
    const later = pend.filter(t=>U.fromToday(t.due) > 7);
    const done = all.filter(t=>t.status==='done').slice(0,20);
    const sec = (title, list, color) => list.length ? `
      <div class="sec-title"><h2 style="font-size:15.5px;color:${color||'var(--text)'}">${title} <span style="font-size:13px;color:var(--text-3);font-weight:500">${list.length}</span></h2></div>
      <div class="list">${list.map(t=>this.taskHTML(t, true)).join('')}</div>` : '';

    el.innerHTML = `
      <button class="btn btn-primary btn-block" id="addTk" style="margin-bottom:16px">＋ 添加作业 / 论文 / PPT</button>
      <div class="grid g4" style="margin-bottom:6px">
        ${[['逾期',overdue.length,'red'],['本周',week.length,'amber'],['以后',later.length,'blue'],['已完成',all.length-pend.length,'green']]
          .map(([l,n,c])=>`<div class="card pad-s" style="text-align:center"><b style="font-size:23px;color:var(--${c})">${n}</b><div style="font-size:12px;color:var(--text-3)">${l}</div></div>`).join('')}
      </div>
      ${sec('⚠️ 已经逾期', overdue, 'var(--red)')}
      ${sec('📌 一周内要交', week, 'var(--amber)')}
      ${sec('🗓️ 后面的安排', later)}
      ${sec('✅ 最近完成', done, 'var(--text-3)')}
      ${!all.length ? `<div class="card">${UI.empty('还没有作业，先加一条试试','📝')}</div>` : ''}`;
    el.querySelector('#addTk').addEventListener('click', ()=>this.addTask());
    el.addEventListener('click', e=>{
      const tk = e.target.closest('[data-tick]'); if(tk){ this.toggleTask(tk.dataset.tick); return; }
      const dl = e.target.closest('[data-deltask]'); if(dl){ UI.confirm('删除该条目？', ()=>{ Store.remove('tasks', dl.dataset.deltask); App.refresh(); }, true); }
    });
  },

  renderExams(el){
    const ex = U.sortBy(Store.d.tasks.filter(t=>t.type==='exam'), t=>t.due);
    const up = ex.filter(t=>t.status!=='done');
    el.innerHTML = `
      <button class="btn btn-primary btn-block" id="addEx" style="margin-bottom:16px">＋ 添加考试</button>
      ${up.length ? `<div class="grid g2" style="margin-bottom:16px">${up.map(t=>{
        const c = t.courseId?this.course(t.courseId):null; const n = U.fromToday(t.due);
        return `<div class="card" style="border-left:4px solid ${n<=3?'var(--red)':n<=7?'var(--amber)':'var(--brand)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div><div style="font-size:16px;font-weight:680">${U.esc(t.title)}</div>
              <div style="font-size:12.5px;color:var(--text-3);margin-top:3px">${c?U.esc(c.name)+' · ':''}${U.fmtDate(t.due,true)}${t.time?' '+t.time:''}</div></div>
            <div style="text-align:right;flex:none">
              <b style="font-size:26px;letter-spacing:-1px;color:${n<=3?'var(--red)':'var(--text)'}">${n<0?'已过':n===0?'今天':n}</b>
              <div style="font-size:11px;color:var(--text-3)">${n>0?'天后':''}</div></div>
          </div>
          ${t.note?`<div class="hint" style="margin-top:10px;white-space:pre-wrap">${U.esc(t.note)}</div>`:''}
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-ghost btn-sm" data-tick="${t.id}" style="flex:1">标记已考完</button>
            <button class="btn btn-danger btn-sm" data-deltask="${t.id}">删除</button>
          </div>
        </div>`;}).join('')}</div>` : `<div class="card">${UI.empty('目前没有安排考试 🎉','🎯')}</div>`}
      ${ex.filter(t=>t.status==='done').length?`<div class="sec-title"><h2 style="font-size:15px;color:var(--text-3)">已考完</h2></div>
        <div class="list">${ex.filter(t=>t.status==='done').map(t=>this.taskHTML(t,true)).join('')}</div>`:''}`;
    el.querySelector('#addEx').addEventListener('click', ()=>this.addTask('', 'exam'));
    el.addEventListener('click', e=>{
      const tk = e.target.closest('[data-tick]'); if(tk){ this.toggleTask(tk.dataset.tick); return; }
      const dl = e.target.closest('[data-deltask]'); if(dl){ UI.confirm('删除该考试？', ()=>{ Store.remove('tasks', dl.dataset.deltask); App.refresh(); }, true); }
    });
  }
};
