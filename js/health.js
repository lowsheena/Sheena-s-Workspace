/* =========================================================
   health.js — 减肥：饮食 / 饮水 / 运动 / 体重 / 计划
   ========================================================= */
const HealthPage = {
  title: '减肥',
  tab: 'today',
  MEALS: [ {k:'breakfast',l:'早餐',i:'🌅'}, {k:'lunch',l:'午餐',i:'☀️'}, {k:'dinner',l:'晚餐',i:'🌙'}, {k:'snack',l:'加餐',i:'🍪'} ],
  /* 常见食物库：每 100g 的热量(kcal) + 别名(支持英文/拼音搜索) + 快速加入时的默认克数 g
     数据为常见参考值，便于「输入食材名自动换算热量」 */
  FOOD_DB: [
    { n:'玉米', k:112, g:150, a:['corn','玉蜀黍','maize'] },
    { n:'白米饭', k:116, g:150, a:['米饭','rice'] },
    { n:'糙米饭', k:112, g:150, a:['糙米','brown rice'] },
    { n:'粥', k:46, g:200, a:['白粥','congee','porridge'] },
    { n:'馒头', k:223, g:80, a:['mantou'] },
    { n:'鸡胸肉', k:165, g:100, a:['鸡胸','chicken breast'] },
    { n:'鸡腿肉', k:209, g:100, a:['鸡腿','chicken thigh'] },
    { n:'鸡蛋', k:144, g:50, a:['蛋','egg'] },
    { n:'香蕉', k:89, g:120, a:['banana'] },
    { n:'苹果', k:52, g:150, a:['apple'] },
    { n:'牛奶', k:65, g:250, a:['milk'] },
    { n:'无糖豆浆', k:31, g:250, a:['豆浆','soy milk','doujiang'] },
    { n:'酸奶', k:72, g:150, a:['yogurt','suannai'] },
    { n:'希腊酸奶', k:59, g:150, a:['greek yogurt'] },
    { n:'红薯', k:99, g:150, a:['地瓜','sweet potato'] },
    { n:'土豆', k:77, g:150, a:['马铃薯','potato'] },
    { n:'南瓜', k:26, g:150, a:['pumpkin','nan gua'] },
    { n:'西兰花', k:34, g:100, a:['青菜花','broccoli'] },
    { n:'番茄', k:18, g:100, a:['西红柿','tomato','fanqie'] },
    { n:'黄瓜', k:15, g:100, a:['cucumber','huanggua'] },
    { n:'胡萝卜', k:41, g:100, a:['carrot','huluobo'] },
    { n:'菠菜', k:23, g:100, a:['spinach','bocai'] },
    { n:'豆腐', k:76, g:100, a:['tofu','doufu'] },
    { n:'瘦猪肉', k:143, g:100, a:['猪肉','pork','zhurou'] },
    { n:'瘦牛肉', k:187, g:100, a:['牛肉','beef','niurou'] },
    { n:'三文鱼', k:208, g:100, a:['salmon','sanwenyu'] },
    { n:'虾', k:99, g:100, a:['shrimp','prawn','xia'] },
    { n:'面包(白)', k:265, g:60, a:['白面包','bread'] },
    { n:'全麦面包', k:250, g:60, a:['wholemeal bread','whole wheat'] },
    { n:'面条(熟)', k:138, g:150, a:['面','noodle','miantiao'] },
    { n:'意大利面(熟)', k:158, g:150, a:['pasta','yidalimian'] },
    { n:'燕麦(干)', k:389, g:40, a:['oats','yanmai'] },
    { n:'花生', k:567, g:30, a:['peanut','huasheng'] },
    { n:'核桃', k:654, g:30, a:['walnut','hetao'] },
    { n:'牛油果', k:160, g:100, a:['avocado','niuyouguo'] },
    { n:'可乐', k:43, g:330, a:['cola','kele'] },
    { n:'黑咖啡', k:1, g:240, a:['coffee','kafei'] },
    { n:'拿铁', k:60, g:300, a:['latte','naluo'] },
    { n:'珍珠奶茶', k:90, g:500, a:['bubble tea','milk tea','zhenzhunaicha'] },
    { n:'橙', k:47, g:130, a:['orange','cheng'] },
    { n:'西瓜', k:30, g:200, a:['watermelon','xigua'] },
    { n:'草莓', k:32, g:100, a:['strawberry','caomei'] },
    { n:'鸡胸肉沙拉', k:120, g:250, a:['salad','沙拉'] },
    /* 新加坡常吃的熟食（每100g 估算） */
    { n:'海南鸡饭', k:160, g:400, a:['hainanese chicken rice'] },
    { n:'叻沙', k:130, g:400, a:['laksa'] },
    { n:'炒粿条', k:185, g:400, a:['char kway teow','炒果条'] },
    { n:'椰浆饭', k:175, g:400, a:['nasi lemak'] },
    { n:'肉骨茶', k:110, g:400, a:['bak kut teh'] },
    { n:'咖喱鸡', k:170, g:300, a:['curry chicken'] },
    { n:'福建面', k:150, g:400, a:['hokkien mee'] },
    { n:'云吞面', k:120, g:400, a:['wonton noodle','wantonnoodle'] },
    { n:'咖椰吐司', k:400, g:120, a:['kaya toast'] },
    { n:'印度煎饼', k:300, g:120, a:['roti prata','prata'] }
  ],
  /* 按名称/别名模糊搜索食物（最多 8 条） */
  searchFood(q){
    const s = String(q||'').trim().toLowerCase();
    if(!s) return [];
    return HealthPage.FOOD_DB.filter(f => f.n.toLowerCase().includes(s) || (f.a||[]).some(x=>x.toLowerCase().includes(s)));
  },
  SPORTS: [
    {l:'快走', met:3.8, i:'🚶‍♀️'}, {l:'慢跑', met:8, i:'🏃‍♀️'}, {l:'骑车', met:6, i:'🚴‍♀️'},
    {l:'游泳', met:7, i:'🏊‍♀️'}, {l:'跳绳', met:10, i:'🪢'}, {l:'力量训练', met:5, i:'🏋️‍♀️'},
    {l:'瑜伽', met:2.8, i:'🧘‍♀️'}, {l:'跳操/舞蹈', met:5.5, i:'💃'}, {l:'球类', met:7, i:'🏸'},
    {l:'爬楼梯', met:8, i:'🪜'}, {l:'家务', met:3, i:'🧹'}, {l:'其他', met:4, i:'✨'}
  ],

  plan(){ return Health.calc(Store.d.profile); },
  curWeight(){
    const w = U.sortBy(Store.d.weights, x=>x.date);
    return w.length ? U.num(w[w.length-1].kg) : U.num(Store.d.profile.weight);
  },
  dayMeals(d){ return Store.d.meals.filter(m=>m.date===d); },
  dayIn(d){ return this.dayMeals(d).reduce((s,m)=>s+U.num(m.calories),0); },
  dayOut(d){ return Store.d.workouts.filter(w=>w.date===d).reduce((s,w)=>s+U.num(w.calories),0); },
  dayWater(d){ return Store.d.water.filter(w=>w.date===d).reduce((s,w)=>s+U.num(w.ml),0); },

  /* ---------------- 录入 ---------------- */
  addMeal(type){
    HealthPage._curPhoto = null;
    HealthPage._mealItems = [];
    HealthPage._mealTotal = 0;
    const quick = this.FOOD_DB.map((f,i)=>`<button type="button" class="opt" data-food="${i}" style="font-weight:500;font-size:12.5px">${f.n} <b style="color:var(--text-3)">${f.k}</b></button>`).join('');
    UI.form({
      title:'记录饮食',
      fields:[
        { key:'type', label:'餐次', type:'opts', value:type||this.guessMeal(), options:this.MEALS.map(m=>({v:m.k,l:m.i+' '+m.l})) },
        { key:'date', label:'日期', type:'date', value:U.today(), half:true },
        { key:'photo', label:'拍照记录（可选，可自动识别热量）', type:'photo', value:'' },
        { key:'note', label:'备注', type:'text', value:'', placeholder:'感受 / 地点', half:true }
      ],
      extraHTML:`
        <div class="field">
          <label>吃了什么（一个个加，自动算热量）</label>
          <div style="position:relative">
            <input class="inp" id="ingInput" placeholder="输入食材，如 玉米 / 鸡胸肉 / 牛奶…" autocomplete="off">
            <div class="suggest" id="ingSuggest" style="display:none"></div>
          </div>
          <div class="ing-list" id="ingList"></div>
          <div class="ing-total">本餐合计 <b id="ingTotal">0</b> kcal</div>
        </div>
        <div class="field"><label>快速选择（点一下加入本餐）</label><div class="opts" id="foodQuick" style="max-height:150px;overflow-y:auto">${quick}</div></div>
        <div id="aiBox" class="field" style="display:none;background:var(--brand-soft);border-radius:12px;padding:12px;margin-top:4px">
          <label style="font-weight:650">🤖 自动识别热量（拍完照后出现）</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button type="button" class="btn btn-ghost btn-sm" id="btnLabel" disabled>📷 识别营养成分表</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btnAI" disabled>✨ AI 估算饭菜</button>
          </div>
          <div id="aiStatus" style="font-size:12px;color:var(--text-3);margin-top:6px;min-height:14px"></div>
        </div>`,
      onPhoto(data, state, r){
        HealthPage._curPhoto = data;
        const box = r.querySelector('#aiBox'); if(box) box.style.display = 'block';
        const b1 = r.querySelector('#btnLabel'), b2 = r.querySelector('#btnAI');
        if(b1) b1.disabled = false; if(b2) b2.disabled = false;
      },
      onMount(r){
        const input = r.querySelector('#ingInput');
        const suggest = r.querySelector('#ingSuggest');
        const listEl = r.querySelector('#ingList');
        const totalEl = r.querySelector('#ingTotal');

        const render = () => {
          listEl.innerHTML = HealthPage._mealItems.length
            ? HealthPage._mealItems.map((it,idx)=>`<div class="ing-item">
                <div class="ing-name">${U.esc(it.name)}</div>
                <div class="ing-g"><input class="inp ing-g-input" type="number" inputmode="decimal" value="${it.grams}" data-g="${idx}"><span>克</span></div>
                <div class="ing-k">${Math.round(it.per100g*it.grams/100)} kcal</div>
                <button type="button" class="mini-btn" data-rm="${idx}">✕</button>
              </div>`).join('')
            : '<div class="ing-empty">还没加食材，在上方搜索添加，或点下方快速选择～</div>';
          const total = HealthPage._mealItems.reduce((s,it)=>s + it.per100g*U.num(it.grams)/100, 0);
          HealthPage._mealTotal = Math.round(total);
          if(totalEl) totalEl.textContent = HealthPage._mealTotal;
        };

        const doSuggest = () => {
          const q = input.value.trim();
          const hits = HealthPage.searchFood(q);
          if(!q || !hits.length){ suggest.style.display='none'; suggest.innerHTML=''; return; }
          suggest.innerHTML = hits.slice(0,8).map(h=>`<div class="sug" data-n="${U.esc(h.n)}" data-k="${h.k}" data-g="${h.g||100}">${U.esc(h.n)} <b>${h.k} kcal/100g</b></div>`).join('');
          suggest.style.display='block';
        };
        input.addEventListener('input', doSuggest);
        input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); const f=suggest.querySelector('.sug'); if(f) f.click(); } });
        suggest.addEventListener('click', e=>{
          const s = e.target.closest('.sug'); if(!s) return;
          HealthPage._mealItems.push({ name:s.dataset.n, per100g:U.num(s.dataset.k), grams:U.num(s.dataset.g)||100 });
          input.value=''; suggest.style.display='none'; suggest.innerHTML=''; render();
        });
        listEl.addEventListener('input', e=>{
          const gi = e.target.closest('[data-g]'); if(gi){ HealthPage._mealItems[+gi.dataset.g].grams = U.num(gi.value)||0; render(); }
        });
        listEl.addEventListener('click', e=>{
          const rm = e.target.closest('[data-rm]'); if(rm){ HealthPage._mealItems.splice(+rm.dataset.rm,1); render(); }
        });

        const qp = r.querySelector('#foodQuick');
        if(qp) qp.addEventListener('click', e=>{
          const b = e.target.closest('[data-food]'); if(!b) return;
          const f = HealthPage.FOOD_DB[+b.dataset.food];
          HealthPage._mealItems.push({ name:f.n, per100g:f.k, grams:f.g||100 });
          render();
        });

        const b1 = r.querySelector('#btnLabel'), b2 = r.querySelector('#btnAI');
        if(b1) b1.addEventListener('click', ()=> HealthPage.recognizeLabel(r, render));
        if(b2) b2.addEventListener('click', ()=> HealthPage.estimateMeal(r, render));

        render();
      },
      onSubmit(st){
        const items = (HealthPage._mealItems||[]).filter(it=> it && it.name && it.grams !== undefined && it.grams !== '');
        if(!items.length){ UI.toast('请先添加至少一样食材'); return false; }
        const total = items.reduce((s,it)=>s + it.per100g*U.num(it.grams)/100, 0);
        const name = items.map(it=>it.name).join(' + ');
        Store.add('meals', { date:st.date||U.today(), type:st.type, name, calories:Math.round(total), items, note:st.note||'', photo:st.photo||'', ts:Date.now() });
        UI.toast('已记录 '+Math.round(total)+' kcal'); App.refresh();
      }
    });
  },
  guessMeal(){ const h = new Date().getHours(); return h<10?'breakfast':h<15?'lunch':h<21?'dinner':'snack'; },

  /* ---------------- 自动识别热量 ---------------- */
  async _ocr(dataUrl){
    if(typeof window === 'undefined' || !('TextDetector' in window)) throw new Error('当前设备不支持原生文字识别（需 iOS 16.4+ Safari / Chrome 94+）');
    const img = await new Promise((res, rej)=>{ const i = new Image(); i.onload = ()=>res(i); i.onerror = rej; i.src = dataUrl; });
    const texts = await new TextDetector().detect(img);
    return texts.map(t=>t.rawValue).join('\n');
  },
  parseNutritionLabel(text){
    if(!text) return null;
    const t = String(text).replace(/\s+/g,' ');
    const re = /(能量|热量|ENERGY)\D*?(\d+(?:\.\d+)?)\s*(千焦|kJ|KJ|kcal|大卡|卡|Cal|CAL)/gi;
    let m, best = null;
    while((m = re.exec(t))){
      const num = U.num(m[2]); const unit = m[3].toLowerCase();
      const kcal = (unit==='kcal'||unit==='大卡'||unit==='cal') ? num : Math.round(num/4.184);
      if(!best || (unit==='kcal'||unit==='大卡')) best = { kcal, raw:m[0] };
    }
    if(!best) return null;
    let basis = 'serving';
    if(/每\s*100\s*(克|g)|100\s*(克|g)|per\s*100/i.test(t)) basis = 'per100';
    else if(/每份|每包|per\s*serving|per\s*pack/i.test(t)) basis = 'serving';
    const note = basis==='per100'
      ? '识别为「每100克 '+best.kcal+' kcal」，若不是吃了一整百克请在保存前改热量'
      : '已从营养成分表识别，请核对后保存';
    return { cal: best.kcal, note, basis };
  },
  async recognizeLabel(r, render){
    const box = r.querySelector('#aiStatus'); const setS = x=>{ if(box) box.textContent = x; };
    if(!HealthPage._curPhoto){ UI.toast('请先拍照'); return; }
    setS('识别营养成分表中…'); UI.toast('识别营养成分表…');
    try{
      const raw = await HealthPage._ocr(HealthPage._curPhoto);
      const info = HealthPage.parseNutritionLabel(raw);
      if(!info){ setS('没找到「能量」数据，请手填或试 AI 估算'); UI.toast('未找到能量信息'); return; }
      HealthPage._mealItems = HealthPage._mealItems || [];
      HealthPage._mealItems.push({ name:'包装食品（'+(info.basis==='per100'?'每100g':'每份')+'）', per100g: info.cal, grams: 100 });
      if(render) render();
      setS(info.note + '（可在食材里改克数）'); UI.toast('已加入 '+info.cal+' kcal');
    }catch(e){ setS('识别失败：'+(e.message||e)); UI.toast('识别失败'); }
  },
  async estimateMeal(r, render){
    const s = Store.d.settings;
    const box = r.querySelector('#aiStatus'); const setS = x=>{ if(box) box.textContent = x; };
    if(!HealthPage._curPhoto){ UI.toast('请先拍照'); return; }
    if(!s.geminiKey){ UI.toast('请先在「设置」填写 Gemini API Key'); App.go('settings'); return; }
    setS('AI 估算中…（可能几秒）'); UI.toast('AI 正在估算热量…');
    try{
      const res = await HealthPage._gemini(s.geminiModel || 'gemini-2.0-flash', s.geminiKey, HealthPage._curPhoto);
      const cal = Math.round(U.num(res.calories));
      if(!cal){ setS('AI 没给出热量，请手填或重试'); UI.toast('AI 未识别热量'); return; }
      HealthPage._mealItems = HealthPage._mealItems || [];
      HealthPage._mealItems.push({ name: res.dish || 'AI 识别餐', per100g: cal, grams: 100 });
      if(render) render();
      setS('AI 估算：'+(res.dish||'这餐')+' 约 '+cal+' kcal'); UI.toast('AI 估算 '+cal+' kcal');
    }catch(e){ setS('AI 失败：'+(e.message||e)); UI.toast('AI 估算失败'); }
  },
  async _gemini(model, key, dataUrl){
    const b64 = (dataUrl.split(',')[1] || dataUrl);
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(key);
    const body = {
      contents:[{ parts:[
        { text:'这是一张食物照片。请识别食物并估算这一餐的总热量。只回复 JSON，格式：{"dish":字符串,"calories":数字(单位千卡kcal),"weight_g":数字,"confidence":0到1的数字}。如果无法判断热量则 calories 填 0。' },
        { inline_data:{ mime_type:'image/jpeg', data:b64 } }
      ]}],
      generationConfig:{ responseMimeType:'application/json' }
    };
    const resp = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if(!resp.ok){ const txt = await resp.text().catch(()=> ''); throw new Error('HTTP '+resp.status+' '+(txt||'').slice(0,140)); }
    const j = await resp.json();
    const txt = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] && j.candidates[0].content.parts[0].text) || '';
    return HealthPage._parseJSON(txt);
  },
  _parseJSON(txt){
    if(!txt) return {};
    try { return JSON.parse(txt); } catch(e){}
    const m = txt.match(/\{[\s\S]*\}/);
    if(m){ try { return JSON.parse(m[0]); } catch(e){} }
    return {};
  },

  addWorkout(){
    const self = this;
    UI.form({
      title:'记录运动',
      fields:[
        { key:'type', label:'运动类型', type:'opts', value:'快走', options:this.SPORTS.map(s=>({v:s.l,l:s.i+' '+s.l})),
          onChange(v,st,r){ self._est(r,st); } },
        { key:'minutes', label:'时长（分钟）', type:'number', value:30, required:true, half:true,
          onChange(v,st,r){ self._est(r,st); } },
        { key:'calories', label:'消耗 kcal', type:'number', value:'', required:true, half:true, hint:'会按体重自动估算，可修改' },
        { key:'date', label:'日期', type:'date', value:U.today() },
        { key:'photo', label:'运动截图 / 照片（可选）', type:'photo', value:'' },
        { key:'note', label:'备注', type:'text', value:'' }
      ],
      onSubmit(st){
        Store.add('workouts', { date:st.date||U.today(), type:st.type, minutes:U.num(st.minutes), calories:U.round(U.num(st.calories),0), note:st.note||'', photo:st.photo||'' });
        UI.toast('干得漂亮！消耗 '+st.calories+' kcal'); App.refresh();
      }
    });
    setTimeout(()=>this._est(document.getElementById('modalRoot'), {type:'快走', minutes:30}), 10);
  },
  _est(r, st){
    if(!r) return;
    const cEl = r.querySelector('#f_calories'); if(!cEl) return;
    const on = r.querySelector('#f_type .opt.on');
    const type = on ? on.dataset.v : st.type;
    const min = U.num(r.querySelector('#f_minutes') ? r.querySelector('#f_minutes').value : st.minutes);
    const sp = this.SPORTS.find(s=>s.l===type) || this.SPORTS[0];
    cEl.value = Math.round(sp.met * 3.5 * this.curWeight() / 200 * min);
  },

  addWater(ml){
    Store.add('water', { date:U.today(), ml:U.num(ml), ts:Date.now() });
    UI.toast('+'+ml+'ml 💧'); App.refresh();
  },

  addWeight(){
    UI.form({
      title:'记录体重',
      fields:[
        { key:'kg', label:'体重（kg）', type:'number', value:this.curWeight(), required:true, step:'0.1', half:true },
        { key:'date', label:'日期', type:'date', value:U.today(), half:true },
        { key:'photo', label:'体重秤照片 / 身材记录（可选）', type:'photo', value:'' },
        { key:'note', label:'备注', type:'text', value:'', placeholder:'例：早起空腹' }
      ],
      onSubmit(st){
        const exist = Store.d.weights.find(w=>w.date===st.date);
        if(exist) Store.update('weights', exist.id, { kg:U.round(U.num(st.kg),1), note:st.note, photo:st.photo||exist.photo });
        else Store.add('weights', { date:st.date||U.today(), kg:U.round(U.num(st.kg),1), note:st.note||'', photo:st.photo||'' });
        Store.d.profile.weight = U.round(U.num(st.kg),1); Store.save();
        UI.toast('已记录 '+st.kg+'kg'); App.refresh();
      }
    });
  },

  editPlan(){
    const p = Store.d.profile;
    UI.form({
      title:'调整减肥计划',
      fields:[
        { key:'height', label:'身高 cm', type:'number', value:p.height, required:true, half:true },
        { key:'weight', label:'当前体重 kg', type:'number', value:this.curWeight(), required:true, step:'0.1', half:true },
        { key:'targetWeight', label:'目标体重 kg', type:'number', value:p.targetWeight, required:true, step:'0.1', half:true },
        { key:'age', label:'年龄', type:'number', value:p.age, required:true, half:true },
        { key:'gender', label:'性别', type:'opts', value:p.gender, options:[{v:'female',l:'女'},{v:'male',l:'男'}] },
        { key:'activity', label:'日常活动量', type:'select', value:p.activity, options:Health.ACT.map(a=>({v:a.v,l:a.label})) },
        { key:'pace', label:'减重节奏', type:'select', value:p.pace, options:Object.keys(Health.PACE).map(k=>({v:k,l:Health.PACE[k].label})) }
      ],
      onSubmit(st){
        Object.assign(Store.d.profile, {
          height:U.num(st.height), weight:U.num(st.weight), targetWeight:U.num(st.targetWeight),
          age:U.num(st.age), gender:st.gender, activity:U.num(st.activity), pace:st.pace
        });
        Store.save(); UI.toast('计划已更新'); App.refresh();
      }
    });
  },

  /* ---------------- 页面 ---------------- */
  render(el){
    // 首次进入：如果还没设置身高体重，显示引导卡片
    const p = Store.d.profile;
    if(!p.height || !p.weight || p.height===165 && p.weight===60 && !p.createdAt){
      el.innerHTML = `
        <div class="card" style="margin-bottom:16px;background:linear-gradient(135deg,#eef0ff,#fdeef6);border:none;text-align:center;padding:28px 20px">
          <div style="font-size:40px;margin-bottom:10px">🏃‍♀️</div>
          <h2 style="margin:0 0 8px;font-size:22px">先告诉我你的身体数据</h2>
          <p style="color:var(--text-2);font-size:14px;line-height:1.7;margin:0 0 22px">
            我会自动帮你算出每日热量目标、蛋白质、饮水量和减肥路线图，之后随时能改。
          </p>
        </div>
        <div class="card">
          ${this._setupFormHTML()}
          <div id="hpPreview"></div>
          <div class="ob-actions" style="margin-top:18px"><button class="btn btn-primary btn-block" id="hpDone">开始我的计划 →</button></div>
        </div>`;
      this._bindSetup(el);
      return;
    }

    el.innerHTML = `
      <div class="seg" id="hTab" style="margin-bottom:16px">
        ${[['today','今日'],['weight','体重'],['plan','计划'],['log','记录']].map(([k,l])=>`<button data-t="${k}" class="${this.tab===k?'on':''}">${l}</button>`).join('')}
      </div>
      <div id="hBody"></div>`;
    el.querySelector('#hTab').addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if(!b) return;
      this.tab = b.dataset.t; this.render(el);
    });
    const body = el.querySelector('#hBody');
    ({ today:()=>this.renderToday(body), weight:()=>this.renderWeight(body), plan:()=>this.renderPlan(body), log:()=>this.renderLog(body) })[this.tab]();
    Photos.hydrate(el);
  },

  renderToday(el){
    const d = U.today(), pl = this.plan();
    const inCal = this.dayIn(d), outCal = this.dayOut(d), net = inCal - outCal;
    const left = pl.target - net;
    const water = this.dayWater(d), cup = U.num(Store.d.settings.waterCup, 250);
    const wPct = U.clamp(water/pl.water, 0, 1);
    const pct = U.clamp(net/pl.target, 0, 1);

    el.innerHTML = `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>今日热量</h3><span class="sub">目标 ${pl.target} kcal</span></div>
          <div class="ring-wrap">
            ${UI.ring(pct, Math.abs(Math.round(left)), left>=0?'还可以吃':'超出', left>=0?(pct>0.85?'amber':'green'):'red')}
            <div style="flex:1;min-width:0">
              <div class="kv"><span>🍽️ 已摄入</span><b>${inCal} kcal</b></div>
              <div class="kv"><span>🔥 运动消耗</span><b style="color:var(--green)">-${outCal} kcal</b></div>
              <div class="kv" style="border-top:1px solid var(--line-soft);margin-top:4px;padding-top:8px"><span>净摄入</span><b>${net} kcal</b></div>
              <div class="kv"><span>基础代谢 BMR</span><b>${pl.bmr}</b></div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn btn-primary btn-sm" style="flex:1" id="bMeal">＋ 记饮食</button>
            <button class="btn btn-ghost btn-sm" style="flex:1" id="bWork">＋ 记运动</button>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>今日饮水</h3><span class="sub">目标 ${pl.water} ml</span></div>
          <div style="display:flex;align-items:baseline;gap:8px">
            <b style="font-size:32px;letter-spacing:-1px">${water}</b><span style="color:var(--text-3)">/ ${pl.water} ml</span>
          </div>
          <div class="progress blue" style="margin:10px 0 12px"><i style="width:${wPct*100}%"></i></div>
          <div style="display:flex;gap:15px;font-size:22px;margin-bottom:12px">
            ${Array.from({length:Math.ceil(pl.water/cup)}).map((_,i)=>`<span style="opacity:${i < Math.floor(water/cup) ? 1 : .22}">💧</span>`).join('')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-soft btn-sm" data-water="${cup}">＋${cup}ml</button>
            <button class="btn btn-soft btn-sm" data-water="500">＋500ml</button>
            <button class="btn btn-ghost btn-sm" data-water="-${cup}">撤销一杯</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>今日饮食</h3><span class="sub">${this.dayMeals(d).length} 条</span></div>
        ${this.MEALS.map(m => {
          const items = this.dayMeals(d).filter(x=>x.type===m.k);
          const cal = items.reduce((s,x)=>s+U.num(x.calories),0);
          return `<div style="margin-bottom:12px">
            <div class="kv" style="padding:0 0 6px"><span style="font-weight:650;color:var(--text)">${m.i} ${m.l}</span><b>${cal} kcal</b></div>
            ${items.length ? `<div class="list">${items.map(x=>`
              <div class="row" style="padding:9px 12px">
                ${x.photo?`<img class="thumb" style="width:36px;height:36px" data-photo="${x.photo}" src="">`:''}
                <div class="r-main"><div class="r-title" style="font-size:13.5px">${U.esc(x.name)}</div>
                ${x.note?`<div class="r-sub">${U.esc(x.note)}</div>`:''}</div>
                <div class="r-amt" style="font-size:13.5px">${x.calories}</div>
                <button class="mini-btn" data-delmeal="${x.id}">✕</button>
              </div>`).join('')}</div>`
            : `<button class="btn btn-ghost btn-sm btn-block" data-addmeal="${m.k}" style="border-style:dashed;color:var(--text-3)">＋ 添加${m.l}</button>`}
          </div>`;
        }).join('')}
      </div>

      <div class="card">
        <div class="card-head"><h3>今日运动</h3><span class="sub">共消耗 ${outCal} kcal</span></div>
        ${(() => { const ws = Store.d.workouts.filter(w=>w.date===d);
          return ws.length ? `<div class="list">${ws.map(w=>{
            const sp = this.SPORTS.find(s=>s.l===w.type)||{i:'✨'};
            return `<div class="row">
              <div class="r-ico">${sp.i}</div>
              ${w.photo?`<img class="thumb" data-photo="${w.photo}" src="">`:''}
              <div class="r-main"><div class="r-title">${U.esc(w.type)}</div><div class="r-sub">${w.minutes} 分钟${w.note?' · '+U.esc(w.note):''}</div></div>
              <div class="r-right"><div class="r-amt" style="color:var(--green)">-${w.calories}</div><div style="font-size:11px;color:var(--text-3)">kcal</div></div>
              <button class="mini-btn" data-delwork="${w.id}">✕</button>
            </div>`;}).join('')}</div>` : UI.empty('今天还没运动，动起来吧','🏃‍♀️'); })()}
      </div>`;

    el.querySelector('#bMeal').addEventListener('click', ()=>this.addMeal());
    el.querySelector('#bWork').addEventListener('click', ()=>this.addWorkout());
    el.addEventListener('click', e => {
      const w = e.target.closest('[data-water]');
      if(w){
        const v = U.num(w.dataset.water);
        if(v < 0){ const list = Store.d.water.filter(x=>x.date===U.today()); if(list.length){ Store.remove('water', list[0].id); App.refresh(); } }
        else this.addWater(v);
        return;
      }
      const am = e.target.closest('[data-addmeal]'); if(am){ this.addMeal(am.dataset.addmeal); return; }
      const dm = e.target.closest('[data-delmeal]'); if(dm){ Store.remove('meals', dm.dataset.delmeal); App.refresh(); return; }
      const dw = e.target.closest('[data-delwork]'); if(dw){ Store.remove('workouts', dw.dataset.delwork); App.refresh(); return; }
    });
  },

  renderWeight(el){
    const p = Store.d.profile, pl = this.plan();
    const ws = U.sortBy(Store.d.weights, x=>x.date);
    const cur = this.curWeight(), start = U.num(p.startWeight, cur), target = U.num(p.targetWeight);
    const lost = U.round(start - cur, 1);
    const total = U.round(start - target, 1);
    const pct = total > 0 ? U.clamp(lost/total, 0, 1) : 0;
    const pts = ws.map(w=>({ x: w.date.slice(5), y: U.num(w.kg) }));

    el.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>减重进度</h3><button class="btn-add" id="bw">＋ 记体重</button></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px">
          <div class="stat"><b>${cur} kg</b><span>当前体重</span></div>
          <div class="stat" style="text-align:center"><b style="color:var(--green)">-${lost>0?lost:0} kg</b><span>已减掉</span></div>
          <div class="stat" style="text-align:right"><b>${target} kg</b><span>目标</span></div>
        </div>
        <div class="progress green"><i style="width:${pct*100}%"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-top:6px">
          <span>起始 ${start} kg</span><span>${Math.round(pct*100)}%</span><span>还差 ${U.round(Math.max(0,cur-target),1)} kg</span>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
          <span class="chip ${Health.bmiColor(pl.bmi)}">BMI ${pl.bmi} · ${pl.bmiLabel}</span>
          <span class="chip">理想区间 ${pl.idealMin}–${pl.idealMax} kg</span>
          ${pl.finishDate?`<span class="chip brand">预计 ${U.fmtDate(pl.finishDate)} 达成</span>`:''}
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>体重曲线</h3><span class="sub">${ws.length} 次记录</span></div>
        ${pts.length ? Charts.line(pts, {color:'#8b5cf6', goal:target, unit:'kg'}) : UI.empty('记录两次以上就能看到趋势啦','📈')}
      </div>

      <div class="card">
        <div class="card-head"><h3>记录明细</h3></div>
        ${ws.length ? `<div class="list">${ws.slice().reverse().map((w,i,arr)=>{
          const prev = arr[i+1]; const diff = prev ? U.round(U.num(w.kg)-U.num(prev.kg),1) : null;
          return `<div class="row">
            ${w.photo?`<img class="thumb" data-photo="${w.photo}" src="">`:`<div class="r-ico">⚖️</div>`}
            <div class="r-main"><div class="r-title">${w.kg} kg</div><div class="r-sub">${U.fmtDate(w.date,true)}${w.note?' · '+U.esc(w.note):''}</div></div>
            ${diff!==null?`<span class="chip ${diff<0?'green':diff>0?'red':''}">${diff>0?'+':''}${diff} kg</span>`:''}
            <button class="mini-btn" data-delw="${w.id}">✕</button>
          </div>`;}).join('')}</div>` : UI.empty('还没有体重记录','⚖️')}
      </div>`;
    el.querySelector('#bw').addEventListener('click', ()=>this.addWeight());
    el.addEventListener('click', e => { const b = e.target.closest('[data-delw]'); if(b){ Store.remove('weights', b.dataset.delw); App.refresh(); } });
  },

  renderPlan(el){
    const p = Store.d.profile, pl = this.plan();
    const cur = this.curWeight(), start = U.num(p.startWeight, cur), target = U.num(p.targetWeight);
    // 里程碑
    const ms = [];
    if(pl.weeklyLoss > 0 && cur > target){
      let w = cur, i = 0;
      while(w > target && i < 52){ i++; w = U.round(Math.max(target, w - pl.weeklyLoss), 1); ms.push({ week:i, date:U.addDays(U.today(), i*7), kg:w }); }
    }
    const shown = ms.filter((m,i)=> i<4 || i%2===1 || i===ms.length-1).slice(0,14);

    el.innerHTML = `
      <div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,#eef0ff,#fdeef6);border:none">
        <div class="card-head"><h3>我的每日目标</h3><button class="btn-add" id="ep">调整</button></div>
        <div class="grid g4" style="gap:10px">
          ${[['🔥',pl.target+' kcal','每日热量'],['💪',pl.protein+' g','蛋白质'],['💧',pl.water+' ml','饮水'],['🏃‍♀️',pl.burnTarget+' kcal','运动消耗']]
            .map(([i,v,l])=>`<div style="background:rgba(255,255,255,.72);border-radius:14px;padding:12px 13px">
              <div style="font-size:17px">${i}</div><b style="display:block;font-size:16px;letter-spacing:-.4px;margin-top:4px">${v}</b>
              <span style="font-size:11.5px;color:var(--text-2)">${l}</span></div>`).join('')}
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;font-size:12.5px;color:var(--text-2)">
          <span>基础代谢 <b>${pl.bmr}</b> kcal</span>
          <span>日消耗 TDEE <b>${pl.tdee}</b> kcal</span>
          <span>每日缺口 <b style="color:var(--green)">${pl.deficit}</b> kcal</span>
          <span>碳水 <b>${pl.carb}g</b> · 脂肪 <b>${pl.fat}g</b></span>
        </div>
      </div>

      <div class="grid g2" style="margin-bottom:14px">
        <div class="card">
          <div class="card-head"><h3>减肥路线图</h3></div>
          <div class="kv"><span>起始体重</span><b>${start} kg</b></div>
          <div class="kv"><span>当前体重</span><b>${cur} kg</b></div>
          <div class="kv"><span>目标体重</span><b style="color:var(--brand)">${target} kg</b></div>
          <div class="kv"><span>还需减掉</span><b>${U.round(Math.max(0,cur-target),1)} kg</b></div>
          <div class="kv"><span>每周预计</span><b>${pl.weeklyLoss} kg</b></div>
          <div class="kv" style="border-top:1px solid var(--line-soft);margin-top:6px;padding-top:9px">
            <span>预计达成</span><b>${pl.finishDate ? U.fmtDate(pl.finishDate)+'（约 '+pl.weeks+' 周）' : '已达成目标 🎉'}</b></div>
          <div class="hint" style="margin-top:10px">目标 BMI ${pl.targetBmi}，处于${Health.bmiLabel(pl.targetBmi)}区间。每周减重超过 1kg 容易反弹，稳一点更持久。</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>每周里程碑</h3><span class="sub">达到即打勾</span></div>
          ${shown.length ? `<div class="list" style="max-height:330px;overflow-y:auto">${shown.map(m=>{
            const hit = cur <= m.kg;
            return `<div class="row" style="padding:10px 12px">
              <div class="tick ${hit?'on':''}" style="cursor:default">${hit?'✓':''}</div>
              <div class="r-main"><div class="r-title" style="font-size:13.5px">第 ${m.week} 周 · ${m.kg} kg</div>
              <div class="r-sub">${U.fmtDate(m.date, true)}</div></div>
            </div>`;}).join('')}</div>` : UI.empty('已经达到目标体重啦 🎉','🏆')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>给你的执行建议</h3></div>
        <div style="font-size:13.5px;color:var(--text-2);line-height:1.9">
          <div>· 每天摄入控制在 <b style="color:var(--text)">${pl.target} kcal</b> 左右，低于 ${p.gender==='male'?1500:1200} kcal 会掉基础代谢，别硬撑。</div>
          <div>· 蛋白质吃够 <b style="color:var(--text)">${pl.protein}g</b>（约 ${Math.round(pl.protein/22)} 份鸡胸肉/鸡蛋/豆制品），减脂不掉肌肉。</div>
          <div>· 每周至少 3 次运动，单次 30 分钟以上，燃脂 + 保持代谢。</div>
          <div>· 早晨空腹、同一个体重秤、同样穿着称重，数据才有可比性。</div>
          <div>· 体重会波动，看 7 天平均值比看单天更准。经期前后浮肿属于正常现象。</div>
        </div>
      </div>`;
    el.querySelector('#ep').addEventListener('click', ()=>this.editPlan());
  },

  renderLog(el){
    const days = [];
    for(let i=0;i<21;i++){
      const d = U.addDays(U.today(), -i);
      const inC = this.dayIn(d), outC = this.dayOut(d), w = this.dayWater(d);
      const wt = Store.d.weights.find(x=>x.date===d);
      if(inC || outC || w || wt) days.push({d, inC, outC, w, wt});
    }
    const pl = this.plan();
    const cal7 = [];
    for(let i=6;i>=0;i--){ const d = U.addDays(U.today(), -i); cal7.push({ label:U.wd(d).slice(1), value: this.dayIn(d) }); }

    el.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="card-head"><h3>近 7 天热量摄入</h3><span class="sub">目标线 ${pl.target}</span></div>
        ${Charts.bars(cal7.map(c=>({...c, color: c.value>pl.target ? 'linear-gradient(180deg,#fca5a5,#ef4444)' : 'linear-gradient(180deg,#6ee7b7,#10b981)'})))}
      </div>
      <div class="card">
        <div class="card-head"><h3>每日汇总</h3><span class="sub">近 3 周</span></div>
        ${days.length ? `<div class="list">${days.map(x=>`
          <div class="row">
            <div class="r-ico">${x.d===U.today()?'📅':'🗓️'}</div>
            <div class="r-main">
              <div class="r-title">${U.fmtDate(x.d, true)}${x.d===U.today()?' <span class="chip brand" style="margin-left:4px">今天</span>':''}</div>
              <div class="r-sub">
                <span>🍽️ ${x.inC} kcal</span><span>🔥 ${x.outC}</span><span>💧 ${x.w}ml</span>${x.wt?`<span>⚖️ ${x.wt.kg}kg</span>`:''}
              </div>
            </div>
            <span class="chip ${x.inC-x.outC <= pl.target ? 'green':'amber'}">净 ${x.inC-x.outC}</span>
          </div>`).join('')}</div>` : UI.empty('还没有记录','📝')}
      </div>`;
  },

  /* ---- 首次进��引导 ---- */
  _setupData: { gender:'female', age:20, height:'', weight:'', targetWeight:'', activity:1.375, pace:'standard' },
  _setupFormHTML(){
    const d = this._setupData;
    return `
      <div class="field"><label>性别</label>
        <div class="opts" id="hpGender">
          <button class="opt ${d.gender==='female'?'on':''}" data-v="female">女</button>
          <button class="opt ${d.gender==='male'?'on':''}" data-v="male">男</button>
        </div></div>
      <div class="two">
        <div class="field"><label>年龄</label><input class="inp" type="number" id="hpAge" value="${d.age}" inputmode="numeric"></div>
        <div class="field"><label>身高 cm</label><input class="inp" type="number" id="hpHeight" value="${d.height||''}" inputmode="decimal"></div>
      </div>
      <div class="two">
        <div class="field"><label>当前体重 kg</label><input class="inp" type="number" step="0.1" id="hpWeight" value="${d.weight||''}" inputmode="decimal"></div>
        <div class="field"><label>目标体重 kg</label><input class="inp" type="number" step="0.1" id="hpTarget" value="${d.targetWeight||''}" inputmode="decimal"></div>
      </div>
      <div class="field"><label>日常活动量</label>
        <select class="inp" id="hpAct">${Health.ACT.map(a=>`<option value="${a.v}" ${a.v==d.activity?'selected':''}>${a.label}</option>`).join('')}</select></div>
      <div class="field" style="margin-bottom:0"><label>减重节奏</label>
        <select class="inp" id="hpPace">${Object.keys(Health.PACE).map(k=>`<option value="${k}" ${k===d.pace?'selected':''}>${Health.PACE[k].label}</option>`).join('')}</select></div>`;
  },
  _bindSetup(el){
    const read = () => {
      this._setupData.gender = el.querySelector('#hpGender .opt.on').dataset.v;
      this._setupData.age = U.num(el.querySelector('#hpAge').value, 20);
      this._setupData.height = U.num(el.querySelector('#hpHeight').value);
      this._setupData.weight = U.num(el.querySelector('#hpWeight').value);
      this._setupData.targetWeight = U.num(el.querySelector('#hpTarget').value);
      this._setupData.activity = U.num(el.querySelector('#hpAct').value, 1.375);
      this._setupData.pace = el.querySelector('#hpPace').value;
      // 实时预览
      const box = el.querySelector('#hpPreview');
      if(box && this._setupData.height && this._setupData.weight){
        try{
          const pl = Health.calc(this._setupData);
          box.innerHTML = `<div class="ob-result" style="margin-top:14px">
            <b style="font-size:14px">实时预览</b>
            <div class="ob-metrics" style="margin-top:10px">
              <div class="ob-metric"><b>${pl.target} kcal</b><span>每日热量</span></div>
              <div class="ob-metric"><b>${pl.protein} g</b><span>蛋白质</span></div>
              <div class="ob-metric"><b>${pl.water} ml</b><span>饮水</span></div>
              <div class="ob-metric"><b>${pl.weeks>0?pl.weeks+' 周':'已达标'}</b><span>预计达成</span></div>
            </div>
          </div>`;
        }catch(e){ box.innerHTML=''; }
      } else { box.innerHTML=''; }
    };
    el.querySelector('#hpGender').addEventListener('click', e=>{
      const b=e.target.closest('.opt');if(!b)return;
      el.querySelectorAll('#hpGender .opt').forEach(x=>x.classList.remove('on')); b.classList.add('on'); read();
    });
    ['#hpAge','#hpHeight','#hpWeight','#hpTarget'].forEach(id=>el.querySelector(id).addEventListener('input', read));
    el.querySelector('#hpAct').addEventListener('change', read);
    el.querySelector('#hpPace').addEventListener('change', read);
    el.querySelector('#hpDone').addEventListener('click', ()=>{
      const d = this._setupData;
      if(!d.height || !d.weight){ UI.toast('请填写身高和体重'); return; }
      if(!d.targetWeight){ UI.toast('请填写目标体重'); return; }
      Object.assign(Store.d.profile, {
        gender:d.gender, age:U.num(d.age), height:U.num(d.height),
        weight:U.num(d.weight), startWeight:U.num(d.weight), targetWeight:U.num(d.targetWeight),
        activity:U.num(d.activity), pace:d.pace, createdAt:U.today()
      });
      Store.d.weights.push({ id:U.uid(), date:U.today(), kg:U.num(d.weight), note:'初始记录', photo:'' });
      Store.save(); UI.toast('计划已生成！🎉');
      this.tab = 'today'; App.refresh();
    });
    read();
  }
};
