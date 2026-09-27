(() => {
  const $ = id => document.getElementById(id);
  const ids = ['unit','startDate','endDate','waterPrevious','waterCurrent','electricPrevious','electricCurrent','waterRate','electricRate','rent','stairs','cleaning','tv'];
  const fields = Object.fromEntries(ids.map(id => [id, $(id)]));
  const currency = n => '$' + Math.round(n).toLocaleString('zh-HK');
  const number = id => fields[id].value.trim() === '' ? null : Number(fields[id].value);
  const amount = id => Math.max(0, number(id) ?? 0);
  const unitKey = unit => `rent-calculator:${unit}:last-readings`;
  const chargeKey = unit => `rent-calculator:${unit}:charges`;
  const electricOnly = () => ['充电桩','公用电'].includes(fields.unit.value);
  const feeIds = ['waterRate','electricRate','rent','stairs','cleaning','tv'];
  const getSaved = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  const localDate = (year, month, day) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const now = new Date();
  fields.startDate.value = localDate(now.getFullYear(),now.getMonth()+1,1);
  fields.endDate.value = localDate(now.getFullYear(),now.getMonth()+1,new Date(now.getFullYear(),now.getMonth()+1,0).getDate());

  function loadReadings() {
    const saved = getSaved(unitKey(fields.unit.value));
    $('selectedUnit').textContent = fields.unit.value;
    const charges = getSaved(chargeKey(fields.unit.value));
    const defaults = {waterRate:5,electricRate:0.7,rent:electricOnly()?0:440,stairs:electricOnly()?0:5,cleaning:electricOnly()?0:15,tv:0};
    for (const id of feeIds) fields[id].value = charges?.[id] ?? defaults[id];
    document.querySelector('.water-row').hidden = electricOnly();
    document.querySelectorAll('.residential-fee').forEach(row => row.hidden = electricOnly());
    fields.waterPrevious.value = electricOnly() ? '' : (saved?.water ?? '');
    fields.electricPrevious.value = saved?.electric ?? '';
    fields.waterCurrent.value = '';
    fields.electricCurrent.value = '';
    $('status').textContent = saved ? `已带入${fields.unit.value}上次保存的读数。` : '';
    render();
  }
  function calculate() {
    const errors = [];
    const readings = {};
    for (const type of ['water','electric']) {
      if (type === 'water' && electricOnly()) { readings.water = null; continue; }
      const prev = number(type+'Previous'), current = number(type+'Current');
      if ((prev !== null && (!Number.isFinite(prev) || prev < 0)) || (current !== null && (!Number.isFinite(current) || current < 0))) errors.push(`${type === 'water' ? '水' : '电'}表读数不能小于 0。`);
      if (prev !== null && current !== null && current < prev) errors.push(`${type === 'water' ? '水' : '电'}表本月读数不可小于上月读数。`);
      readings[type] = prev !== null && current !== null && current >= prev ? current-prev : null;
    }
    for (const id of feeIds) {
      if (number(id) !== null && (!Number.isFinite(number(id)) || number(id) < 0)) errors.push('单价及费用不能小于 0。');
    }
    if (!fields.startDate.value || !fields.endDate.value || fields.endDate.value < fields.startDate.value) errors.push('请检查计费起止日期。');
    const water = electricOnly() ? 0 : readings.water === null ? null : Math.round(readings.water * amount('waterRate'));
    const electric = readings.electric === null ? null : Math.round(readings.electric * amount('electricRate'));
    const fixed = electricOnly() ? 0 : ['rent','stairs','cleaning','tv'].reduce((sum,id) => sum + Math.round(amount(id)),0);
    const complete = water !== null && electric !== null && !errors.length;
    return {readings, water, electric, fixed, total: complete ? water+electric+fixed : null, errors};
  }
  function render() {
    const result = calculate();
    $('waterUsage').textContent = result.readings.water === null ? '—' : result.readings.water.toLocaleString('zh-HK');
    $('electricUsage').textContent = result.readings.electric === null ? '—' : result.readings.electric.toLocaleString('zh-HK');
    $('waterAmount').textContent = electricOnly() || result.water === null ? '—' : currency(result.water);
    $('electricAmount').textContent = result.electric === null ? '—' : currency(result.electric);
    $('rentAmount').textContent = currency(amount('rent'));
    $('total').textContent = result.total === null ? '填写读数后显示' : currency(result.total);
    $('periodLabel').textContent = fields.startDate.value && fields.endDate.value ? `${fields.startDate.value} 至 ${fields.endDate.value}` : '计费日期';
    $('footnote').textContent = electricOnly() ? '电费按元四舍五入。读数只保存在这部设备。' : '水电金额按元四舍五入。租金按整月计算，不因日期自动分摊。资料只保存在这部设备。';
    $('error').hidden = !result.errors.length;
    $('error').textContent = result.errors[0] || '';
    $('saveButton').disabled = $('imageButton').disabled = result.total === null;
    return result;
  }
  function toChineseMoney(value) {
    const digits = '零壹贰叁肆伍陆柒捌玖';
    if (value === 0) return '零元整';
    const four = n => {
      let out = '', zero = false;
      for (let place = 3; place >= 0; place--) {
        const divisor = 10 ** place, digit = Math.floor(n / divisor) % 10;
        if (digit) { if (zero && out) out += '零'; out += digits[digit] + ['', '拾', '佰', '仟'][place]; zero = false; }
        else if (out) zero = true;
      }
      return out;
    };
    const groups = [], units = ['', '万', '亿'];
    let n = Math.round(value);
    while (n && groups.length < units.length) { groups.push(n % 10000); n = Math.floor(n / 10000); }
    if (n) return `${currency(value)}元整`;
    let out = '', pendingZero = false;
    for (let i = groups.length - 1; i >= 0; i--) {
      if (!groups[i]) { pendingZero = !!out; continue; }
      if (out && (pendingZero || groups[i] < 1000)) out += '零';
      out += four(groups[i]) + units[i]; pendingZero = false;
    }
    return out + '元整';
  }
  function makeBillCanvas(result) {
    const canvas = document.createElement('canvas'); canvas.width = 2100; canvas.height = 1250;
    const c = canvas.getContext('2d');
    c.fillStyle = '#fffdf4'; c.fillRect(0,0,2100,1250);
    c.fillStyle = '#252720'; c.textBaseline = 'middle';
    const label = (text,x,y,size=43,weight='500',align='center',max=1000,color='#252720') => {
      c.fillStyle=color; c.font=`${weight} ${size}px "PingFang SC","Noto Sans SC",sans-serif`;
      c.textAlign=align; c.fillText(String(text),x,y,max);
    };
    label('租　单',1050,88,76,'700');
    label(`租用地址：${fields.unit.value}`,100,184,45,'600','left',1250);
    label(`日期：${fields.endDate.value.replaceAll('-',' / ')}`,2000,184,43,'500','right',650);
    const widths=[245,260,200,220,190,230,230,325];
    const xs=[100]; for(const width of widths) xs.push(xs.at(-1)+width);
    const heights=[82,132,132,113,96,96,96,125];
    const ys=[260]; for(const height of heights) ys.push(ys.at(-1)+height);
    c.strokeStyle='#2e302b'; c.lineWidth=4;
    for (const x of xs) { c.beginPath(); c.moveTo(x,ys[0]); c.lineTo(x,ys.at(-1)); c.stroke(); }
    for (const y of ys) { c.beginPath(); c.moveTo(xs[0],y); c.lineTo(xs.at(-1),y); c.stroke(); }
    const center=(col,row)=>[(xs[col]+xs[col+1])/2,(ys[row]+ys[row+1])/2];
    const cell=(col,row,text,size=41,weight='500',color='#252720')=>{const [x,y]=center(col,row);label(text,x,y,size,weight,'center',widths[col]-18,color);};
    ['项目','金额（元）','单价（元）','用量','单位','上月读数','本月读数','日期'].forEach((s,i)=>cell(i,0,s,38,'700',i===5?'#b32c26':'#252720'));
    const month = fields.endDate.value.slice(5,7).replace(/^0/,'')+'月份';
    const entries=[
      ['水费',electricOnly()?'—':currency(result.water),electricOnly()?'':fields.waterRate.value,electricOnly()?'':result.readings.water,electricOnly()?'':'立方米',electricOnly()?'':fields.waterPrevious.value,electricOnly()?'':fields.waterCurrent.value,electricOnly()?'':month],
      ['电费',currency(result.electric),fields.electricRate.value,result.readings.electric,'度',fields.electricPrevious.value,fields.electricCurrent.value,month],
      ['租金',electricOnly()?'—':currency(amount('rent')),electricOnly()?'':'计费日期',electricOnly()?'':`${fields.startDate.value.slice(5)} 至`,electricOnly()?'':fields.endDate.value.slice(5),'','',electricOnly()?'':month],
      ['楼梯灯',electricOnly()?'—':currency(amount('stairs')),'','','','','',electricOnly()?'':month],
      ['卫生费',electricOnly()?'—':currency(amount('cleaning')),'','','','','',electricOnly()?'':month],
      ['有线电视',electricOnly()?'—':amount('tv') ? currency(amount('tv')) : '—','','','','','',electricOnly()?'':month]
    ];
    entries.forEach((row,r)=>row.forEach((value,col)=>cell(col,r+1,value,col===3&&r===2?33:42,col<2?'600':'500',col===5?'#b32c26':'#252720')));
    cell(0,7,'合计',51,'700'); cell(1,7,currency(result.total),61,'700','#a23a32');
    label(`大写：${toChineseMoney(result.total)}`,xs[2]+25,(ys[7]+ys[8])/2,43,'600','left',xs[8]-xs[2]-45);
    label(electricOnly()?'请核对电表读数及金额。':'请核对水电表读数及金额，并于每月 7 天前付清房租。',100,1192,35,'500','left',1880);
    return canvas;
  }
  let billBlob = null, previewUrl = null;
  $('imageButton').addEventListener('click',async () => {
    const result=render(); if(result.total===null) return;
    try {
      const canvas=makeBillCanvas(result);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if (!blob) throw Error('图片未能建立');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      billBlob=blob; previewUrl=URL.createObjectURL(blob);
      $('billPreview').src=previewUrl; $('imageDialog').showModal();
    } catch { $('status').textContent='暂时无法制作图片，请重试。'; }
  });
  $('downloadImage').addEventListener('click',async () => {
    if (!billBlob) return;
    const filename=`租单-${fields.unit.value.replace('/','-')}-${fields.endDate.value}.png`;
    const file=new File([billBlob],filename,{type:'image/png'});
    if (navigator.share && navigator.canShare?.({files:[file]})) {
      try { await navigator.share({files:[file],title:'租单图片'}); return; }
      catch (error) { if(error.name==='AbortError') return; }
    }
    const link=document.createElement('a'); link.href=previewUrl; link.download=filename;
    document.body.append(link); link.click(); link.remove();
  });
  $('closeImage').addEventListener('click',() => $('imageDialog').close());
  for (const id of ids) fields[id].addEventListener(id === 'unit' ? 'change' : 'input', () => {
    if (id === 'unit') return loadReadings();
    if (feeIds.includes(id)) {
      localStorage.setItem(chargeKey(fields.unit.value),JSON.stringify(Object.fromEntries(feeIds.map(key => [key,fields[key].value]))));
    }
    $('status').textContent = '';
    render();
  });
  $('saveButton').addEventListener('click',() => {
    const result = render(); if (result.total === null) return;
    localStorage.setItem(unitKey(fields.unit.value),JSON.stringify({water:electricOnly()?'':fields.waterCurrent.value,electric:fields.electricCurrent.value,date:fields.endDate.value}));
    $('status').textContent = `已保存${fields.unit.value}本月读数，下次会自动带入“上月读数”。`;
  });
  $('installButton').addEventListener('click',() => $('installDialog').showModal());
  $('closeDialog').addEventListener('click',() => $('installDialog').close());
  loadReadings();
  if ('serviceWorker' in navigator) window.addEventListener('load',() => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  if (document.modelContext?.registerTool) {
    const units=['6栋1楼前座','6栋1楼后座','6栋2楼201/202楼全座','6栋3楼顶座','充电桩','公用电'];
    try { Promise.resolve(document.modelContext.registerTool({name:'set_rent_calculation',title:'填写费用计算',description:'选择地址或电费项目，填写日期和电表读数；住宅还需填写水表读数。',inputSchema:{type:'object',properties:{unit:{type:'string',enum:units},startDate:{type:'string'},endDate:{type:'string'},waterPrevious:{type:'number',minimum:0},waterCurrent:{type:'number',minimum:0},electricPrevious:{type:'number',minimum:0},electricCurrent:{type:'number',minimum:0}},required:['unit','startDate','endDate','electricPrevious','electricCurrent'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){const utility=['充电桩','公用电'].includes(input.unit);const readIds=utility?['electricPrevious','electricCurrent']:['waterPrevious','waterCurrent','electricPrevious','electricCurrent'];if(!units.includes(input.unit)||!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)||!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)||input.endDate<input.startDate||readIds.some(key=>!Number.isFinite(input[key])||input[key]<0)||input.electricCurrent<input.electricPrevious||(!utility&&input.waterCurrent<input.waterPrevious))throw Error('日期或读数不正确');fields.unit.value=input.unit;loadReadings();for(const key of ['startDate','endDate',...readIds])fields[key].value=input[key];const result=render();return {unit:input.unit,total:result.total,water:result.water,electric:result.electric};}})).catch(()=>{}); } catch {}
  }
})();
