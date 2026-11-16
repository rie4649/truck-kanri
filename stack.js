/* =====================================================================
   stack.js — スタック連動（スタック版 1　2026年11月16日）
   ・このファイルは「スタックプロジェクト」が直します。
   ・index.html（トラック管理・社内案内）は、トラック管理側が直します。おたがいのファイルはさわらない。
   ・直したら下の STACK_VER を「スタック版 2, 3…」と上げてください（画面のチェックの横に出ます）。

   index.html が用意しているもの（使ってよい）：
     SG（社内案内の状態）, SG_ALL（章の順番）, SG_CH（章の名前）, sgStart, sgClose, sgScene,
     sgWhoTxt, sgSayOf, db（Firestore）, $（getElementById）, toast
   index.html から呼ばれるもの（名前を変えないこと）：
     window.STACK.on      … 連動中なら true（このとき社内案内は声を出さず、自動で進まない）
     window.STACK.report(o) … 今のページ（章・何枚目・セリフ）を受け取る
   画面のチェック「🤖 スタックに話してもらう」は、index.html の <span id="stackSlot"> に、このファイルが入れます。
   ===================================================================== */
(function(){
const STACK_VER = "スタック版 1";
const slot = document.getElementById("stackSlot");
if (slot) slot.innerHTML = '<label class="sgsnd" title="ロボットのスタックから社内案内を進めます"><input type="checkbox" id="sgStackMode"> 🤖 スタックに話してもらう <small style="color:#94a3b8;">（' + STACK_VER + '）</small></label>';
if (!document.getElementById("sgStackMode")) return;
/* ===== スタック連動（版6.6 2026/11/15）=====
   ロボット「スタック」が社内案内を進めて、セリフを話す。
   Firestore: stackLink/truck_cmd … スタックからの合図 { cmd:start|chapter|next|prev|again|stop, ch, ms }
              stackLink/truck_state … 今のページ { active, chapter, chapterName, scene, total, say, cmdMs, ms }
   「🤖 スタックに話してもらう」をオンにした端末だけが合図を受ける。オンの間、この画面は声を出さず自動でも進まない。
   セリフを✏️で直すと、スタックが話すセリフも同じように変わる。 */
const STK = { on:false, unsub:null, ready:false, lastMs:0, cmdMs:0 };
const STK_LIST = () => SG_ALL.filter(k => k !== "tour");
function stkReport(o){ try { db.collection("stackLink").doc("truck_state").set(Object.assign({ cmdMs:STK.cmdMs, ms:Date.now() }, o)).catch(e => console.error(e)); } catch(e){ console.error(e); } }
function stkCmd(c){ STK.cmdMs = c.ms;
  if (c.cmd === "start" || c.cmd === "chapter"){
    if ($("siteView").hidden){ const b = document.querySelector('.tab-btn[data-tab="site"]'); if (b) b.click(); }
    SG.play = false;
    if (c.ch && /^L_/.test(c.ch) && SG_CH[c.ch]){ SG.mode = "les"; sgStart([c.ch], false); return; }
    SG.mode = "show"; const list = STK_LIST(), i = c.ch ? list.indexOf(c.ch) : 0;
    sgStart(list.slice(Math.max(0, i)), true); return; }
  if (c.cmd === "stop"){ sgClose(); stkReport({ active:false, say:"社内案内を閉じました" }); return; }
  if ($("sgShow").hidden){ stkReport({ active:false, say:"今は社内案内を開いていません。「社内案内を始めて」と言ってください" }); return; }
  SG.play = false;
  if (c.cmd === "next") sgScene(SG.si + 1);
  else if (c.cmd === "prev") sgScene(SG.si - 1);
  else sgScene(SG.si); }
function stkSetMode(on){ STK.on = !!on; try { localStorage.setItem("sg_stack", STK.on ? "1" : "0"); } catch(e){} $("sgStackMode").checked = STK.on;
  if (STK.on){ SG.play = false; try { speechSynthesis.cancel(); } catch(e){} }
  if (STK.on && !STK.unsub){ STK.ready = false;
    STK.unsub = db.collection("stackLink").doc("truck_cmd").onSnapshot(d => { const c = d.exists ? d.data() : null;
      if (!STK.ready){ STK.ready = true; STK.lastMs = (c && c.ms) || 0; return; }   /* 開いた時に残っている合図は動かさない */
      if (!c || !c.ms || c.ms <= STK.lastMs) return; STK.lastMs = c.ms; stkCmd(c); }, e => { console.error(e); toast("スタック連動：読み込めません（Firestoreのルールを確認）"); }); }
  if (!STK.on && STK.unsub){ STK.unsub(); STK.unsub = null; } }
$("sgStackMode").addEventListener("change", e => { stkSetMode(e.target.checked); toast(e.target.checked ? "🤖 スタック連動オン：スタックの合図で社内案内が進みます" : "スタック連動オフ"); });
try { if (localStorage.getItem("sg_stack") === "1") stkSetMode(true); } catch(e){}
window.STACK = { get on(){ return STK.on; }, report: stkReport, ver: STACK_VER };
})();
