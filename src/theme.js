/**
 * The whole stylesheet, as one string mounted in a single <style> block.
 *
 * Tokens and the card/spread rules come from app/KindredSpirits.prototype.jsx
 * unchanged — see docs/DESIGN.md. Everything added here is layout for the
 * screens the prototype did not have. Plain CSS on purpose: no utility
 * framework, no CSS-in-JS.
 */

// The webfonts are linked from index.html, not imported here: an @import in
// this string cannot start loading until React has mounted.
export const CSS = `
:root{ --felt:#0E241C; --felt-2:#081713; --felt-3:#16342A;
  --ivory:#F3EEE2; --ink:#16140F; --red:#BE1C2D; --brass:#C6A03C; --mute:#87A196; }

*{box-sizing:border-box}
html,body{margin:0; padding:0; background:var(--felt); color:var(--ivory);
  -webkit-text-size-adjust:100%; -webkit-tap-highlight-color:transparent}
body{font-family:Inter,system-ui,-apple-system,sans-serif;
  overscroll-behavior-y:none}

.ks{ background:var(--felt); color:var(--ivory); min-height:100dvh;
  max-width:520px; margin:0 auto; position:relative;
  padding:calc(18px + env(safe-area-inset-top)) 16px
          calc(112px + env(safe-area-inset-bottom)); }
.ks.flat{padding-bottom:calc(24px + env(safe-area-inset-bottom))}

/* ---------- type ---------- */
.ks-mark{font-family:'Bodoni Moda',Georgia,serif; font-size:26px; font-weight:800;
  letter-spacing:-.01em; line-height:1.05; margin:0 0 2px}
.ks-sub{color:var(--mute); font-size:13px; margin:0 0 22px; line-height:1.5}
.ks-h{font-family:'Bodoni Moda',Georgia,serif; font-size:19px; font-weight:600; margin:0 0 12px}
.ks-note{color:var(--mute); font-size:13px; line-height:1.55; margin:0 0 14px}
.ks-rule{border:0; border-top:1px solid var(--felt-3); margin:30px 0 22px}
.ks-eyebrow{font-size:13px; letter-spacing:.01em; color:var(--mute); margin:0 0 8px}

/* ---------- form ---------- */
.ks-field{display:block; margin-bottom:12px}
.ks-field span{display:block; font-size:13px; color:var(--mute); margin-bottom:6px}
.ks-field input,.ks-field textarea{width:100%; padding:12px 13px; border-radius:3px;
  font-size:16px; font-family:inherit; background:var(--felt-2); color:var(--ivory);
  border:1px solid var(--felt-3)}
.ks-field textarea{min-height:74px; resize:vertical; line-height:1.5}
.ks-field input:focus,.ks-field textarea:focus{outline:2px solid var(--brass); outline-offset:1px}

.ks-seg{display:flex; border:1px solid var(--felt-3); border-radius:3px;
  overflow:hidden; margin:16px 0}
.ks-seg button{flex:1; padding:11px 8px; background:var(--felt-2); color:var(--mute);
  border:0; font:inherit; font-size:13px; cursor:pointer; line-height:1.35; text-align:center}
.ks-seg button b{display:block; color:var(--ivory); font-weight:600; font-size:14px}
.ks-seg button[aria-pressed="true"]{background:var(--felt-3); color:var(--ivory)}
.ks-seg button[aria-pressed="true"] b{color:var(--brass)}

.ks-go{width:100%; padding:14px; border:0; border-radius:3px; cursor:pointer;
  background:var(--brass); color:#1B1503; font:inherit; font-weight:600; font-size:15px}
.ks-go:disabled{opacity:.4; cursor:not-allowed}
.ks-ghost{width:100%; padding:13px; border:1px solid var(--felt-3); border-radius:3px;
  cursor:pointer; background:transparent; color:var(--ivory); font:inherit; font-size:14px}

/* ---------- card faces ---------- */
.card{background:var(--ivory); color:var(--ink); border-radius:5px;
  position:relative; display:flex; align-items:center; justify-content:center;
  font-family:'Bodoni Moda',Georgia,serif; box-shadow:0 2px 0 rgba(0,0,0,.35)}
.card.red{color:var(--red)}
.card .idx{position:absolute; top:5px; left:6px; font-size:13px; font-weight:600;
  line-height:1; text-align:center}
.card .idx i{display:block; font-style:normal; font-size:11px}
.card .pip{font-size:40px; line-height:1}
.card-lg{width:104px; height:146px; flex:none}
.card-lg .pip{font-size:58px}
.card-lg .idx{font-size:18px; top:7px; left:8px}
.card-lg .idx i{font-size:15px}
.card-sm{width:44px; height:62px; flex:none}
.card-sm .pip{font-size:22px}
.card-sm .idx{font-size:11px; top:3px; left:4px}
.card-sm .idx i{font-size:9px}
.card-back{background:
    repeating-linear-gradient(45deg,#3A1116 0 5px,#4A161C 5px 10px);
  border:2px solid var(--ivory)}
.card .art{position:absolute; inset:0; width:100%; height:100%; object-fit:contain;
  filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.card .art.loading{opacity:0}
.card.has-art{background:transparent; box-shadow:none}

/* ---------- the one motion moment ---------- */
.flip{perspective:900px}
.flip-in{animation:turn .55s cubic-bezier(.3,.8,.4,1) both}
@keyframes turn{from{transform:rotateY(90deg)}to{transform:rotateY(0)}}
.reveal-stage{display:flex; flex-direction:column; align-items:center;
  justify-content:center; min-height:76dvh; text-align:center; gap:6px}
.reveal-stage .card-xl{width:170px; height:238px; flex:none}
.reveal-stage .card-xl .pip{font-size:92px}
.reveal-stage .card-xl .idx{font-size:26px; top:11px; left:13px}
.reveal-stage .card-xl .idx i{font-size:21px}
.turnable{transform-style:preserve-3d; transition:transform .85s cubic-bezier(.3,.8,.4,1)}
.turnable.turned{transform:rotateY(180deg)}
.turnable > *{backface-visibility:hidden; position:absolute; inset:0}
.turnable .face{transform:rotateY(180deg)}
.turn-wrap{position:relative; width:170px; height:238px}
.fade-up{animation:fadeUp .5s ease both}
@keyframes fadeUp{from{opacity:0; transform:translateY(7px)}to{opacity:1; transform:none}}
@media (prefers-reduced-motion:reduce){
  .flip-in,.fade-up{animation:none}
  .turnable{transition:none}
}

/* ---------- hero ---------- */
.hero{display:flex; gap:18px; align-items:center}
.hero dl{margin:0; font-size:13px; line-height:1.6}
.hero dt{color:var(--mute)}
.hero dd{margin:0 0 9px; font-size:15px; font-weight:500}
.hero .big{font-family:'Bodoni Moda',Georgia,serif; font-size:24px; font-weight:600;
  line-height:1.15; margin-bottom:11px}

/* ---------- the spread ---------- */
.spread{display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-bottom:10px}
.cell{aspect-ratio:5/7; border-radius:3px; background:var(--felt-2);
  border:1px solid var(--felt-3); display:flex; align-items:center;
  justify-content:center; font-family:'Bodoni Moda',Georgia,serif;
  font-size:11px; font-weight:600; color:#4E6B60; padding:1px}
.cell.void{background:transparent; border-color:transparent}
.cell.diag{background:var(--felt-3); border-color:var(--brass); color:var(--ivory)}
.cell.prc{background:#332910; border-color:var(--brass); color:var(--brass)}
.cell.self{background:var(--ivory); border-color:var(--ivory); color:var(--ink);
  font-size:12px; font-weight:800}
.cell.self.isred{color:var(--red)}
.cell.them{box-shadow:inset 0 0 0 2px var(--red)}

.legend{display:flex; flex-wrap:wrap; gap:12px; font-size:12px; color:var(--mute);
  margin-bottom:6px}
.legend i{display:inline-block; width:9px; height:9px; border-radius:2px;
  margin-right:5px; vertical-align:middle}

.chips{display:grid; grid-template-columns:repeat(auto-fill,minmax(46px,1fr)); gap:6px}
.chip{aspect-ratio:5/7; font-size:13px}
.chip .pip{font-size:17px}
.chip .idx{font-size:10px; top:3px; left:4px}
.chip .idx i{font-size:9px}
.chip.hit{outline:2px solid var(--brass); outline-offset:1px}

/* ---------- verdict ---------- */
.verdict{border:1px solid var(--felt-3); border-left:3px solid var(--brass);
  border-radius:3px; padding:14px 15px; background:var(--felt-2)}
.verdict h3{font-family:'Bodoni Moda',Georgia,serif; font-size:19px; margin:0 0 7px;
  text-transform:none}
.verdict p{margin:0 0 8px; font-size:13.5px; line-height:1.6; color:#CFE0D7}
.verdict p:last-child{margin-bottom:0}
.verdict b{color:var(--brass); font-weight:600}
.verdict.t0{border-left-color:#5D6F68}
.verdict.t1{border-left-color:var(--mute)}

/* ---------- match feed ---------- */
.feed{list-style:none; margin:0; padding:0}
.feed li{margin-bottom:8px}
.row{display:flex; gap:12px; align-items:center; width:100%; text-align:left;
  padding:11px 12px; border:1px solid var(--felt-3); border-radius:4px;
  background:var(--felt-2); color:inherit; font:inherit; cursor:pointer}
.row:active{background:var(--felt-3)}
.row .who{flex:1; min-width:0}
.row .nm{font-size:15px; font-weight:600; line-height:1.25;
  display:flex; align-items:baseline; gap:7px}
.row .nm em{font-style:normal; color:var(--mute); font-weight:400; font-size:13px}
.row .cardname{font-family:'Bodoni Moda',Georgia,serif; font-size:12.5px;
  color:var(--mute); margin:2px 0 4px}
.row .why{font-size:12.5px; line-height:1.45; color:#CFE0D7;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.row .chev{color:var(--mute); font-size:18px; flex:none}
.tierdot{display:inline-block; width:7px; height:7px; border-radius:50%; flex:none}
.t3 .tierdot{background:var(--brass)}
.t2 .tierdot{background:#7FA88C}
.t1 .tierdot{background:var(--mute)}
.t0 .tierdot{background:#4A5C55}
.row.t3{border-left:3px solid var(--brass)}
.row.t2{border-left:3px solid #7FA88C}

.groupby{font-size:12px; color:var(--mute); margin:20px 0 9px;
  display:flex; align-items:center; gap:8px}
.groupby::after{content:""; flex:1; border-top:1px solid var(--felt-3)}

/* ---------- tab bar ---------- */
.tabs{position:fixed; left:0; right:0; bottom:0; z-index:20;
  display:flex; background:var(--felt-2); border-top:1px solid var(--felt-3);
  padding-bottom:env(safe-area-inset-bottom)}
.tabs > div{max-width:520px; margin:0 auto; display:flex; width:100%}
.tabs button{flex:1; padding:11px 4px 12px; background:none; border:0; cursor:pointer;
  font:inherit; font-size:12px; color:var(--mute); display:flex; flex-direction:column;
  align-items:center; gap:3px}
.tabs button[aria-selected="true"]{color:var(--brass)}
.tabs button i{font-style:normal; font-size:16px; line-height:1}

/* ---------- sheet / detail ---------- */
.back{background:none; border:0; color:var(--mute); font:inherit; font-size:13.5px;
  padding:4px 0 14px; cursor:pointer; display:inline-flex; align-items:center; gap:6px}
.pair{display:flex; align-items:flex-start; justify-content:center; gap:14px;
  margin:4px 0 18px}
.pair figure{margin:0; text-align:center; width:104px}
.pair figcaption{font-size:12px; color:var(--mute); margin-top:7px; line-height:1.4}
.pair figcaption b{display:block; color:var(--ivory); font-weight:600; font-size:13px;
  font-family:'Bodoni Moda',Georgia,serif}
.pair .vs{align-self:center; color:var(--mute); font-family:'Bodoni Moda',Georgia,serif;
  font-size:15px; padding-top:44px}

.kv{margin:0 0 18px; font-size:13.5px; line-height:1.65}
.kv div{display:flex; gap:10px; padding:7px 0; border-bottom:1px solid var(--felt-3)}
.kv div:last-child{border-bottom:0}
.kv dt{color:var(--mute); flex:none; width:118px}
.kv dd{margin:0; flex:1}

.callout{border:1px dashed var(--felt-3); border-radius:4px; padding:13px 14px;
  font-size:13px; line-height:1.6; color:var(--mute); background:var(--felt-2)}
.callout b{color:var(--ivory); font-weight:600}

/* ---------- booking ---------- */
.book{border:1px solid var(--felt-3); border-radius:4px; padding:16px;
  background:var(--felt-2); margin-top:8px}
.book h2{font-family:'Bodoni Moda',Georgia,serif; font-size:18px; margin:0 0 6px}
.book p{font-size:13px; line-height:1.6; color:var(--mute); margin:0 0 14px}
.book .ok{font-size:13px; line-height:1.6; color:var(--brass); margin:0}

/* ---------- bowties ---------- */
.bowtie{position:relative; display:inline-block; flex:none; width:var(--w);
  aspect-ratio:120/72}
.bowtie svg{position:absolute; inset:0; width:100%; height:100%; overflow:visible}
.bowtie .wing{fill:var(--tie); stroke:rgba(0,0,0,.3); stroke-width:1.5; stroke-linejoin:round}
.bowtie .fold{fill:rgba(0,0,0,.16)}
.bowtie .knot{position:absolute; left:50%; top:50%; width:44%; aspect-ratio:1;
  transform:translate(-50%,-50%); border-radius:50%; background:var(--tie);
  box-shadow:0 0 0 2px var(--felt-2), inset 0 0 0 1px rgba(0,0,0,.25);
  display:flex; align-items:center; justify-content:center; overflow:hidden}
.bowtie .knot img{width:100%; height:100%; object-fit:cover}
.bowtie .face{line-height:1; font-size:calc(var(--w) * .24)}
.bowtie-sm{--w:52px}
.bowtie-md{--w:108px}
.bowtie-lg{--w:168px}

.emblem{display:flex; flex-direction:column; align-items:center; gap:9px;
  margin:6px 0 18px; text-align:center}
.emblem-cap{margin:0; max-width:320px; font-family:'Bodoni Moda',Georgia,serif;
  font-size:16px; line-height:1.35}
.emblem-cap.empty{font-family:inherit; font-size:13px; color:var(--mute)}
.emblem .ks-ghost{width:auto; padding:9px 16px; font-size:13px}

.wall{list-style:none; margin:0; padding:0; display:grid;
  grid-template-columns:repeat(auto-fill,minmax(148px,1fr)); gap:8px}
.tile{width:100%; height:100%; display:flex; flex-direction:column; align-items:center;
  gap:6px; padding:16px 10px 14px; text-align:center; border:1px solid var(--felt-3);
  border-radius:4px; background:var(--felt-2); color:inherit; font:inherit; cursor:pointer}
button.tile:active{background:var(--felt-3)}
.tile b{font-size:14px; font-weight:600; margin-top:4px}
.tile b em{font-style:normal; font-weight:400; font-size:12px; color:var(--brass); margin-left:6px}
.tile p{margin:0; font-size:12.5px; line-height:1.4; color:#CFE0D7}
.tile.mine{border-color:var(--brass); cursor:default}
.tile .ks-ghost{margin-top:auto; padding:7px 10px; font-size:12.5px}

.picks{display:grid; grid-template-columns:repeat(8,1fr); gap:6px; margin-bottom:12px}
.picks button{aspect-ratio:1; padding:0; font-size:20px; line-height:1; cursor:pointer;
  border:1px solid var(--felt-3); border-radius:3px; background:var(--felt-2)}
.picks button[aria-pressed="true"]{border-color:var(--brass); background:var(--felt-3)}
.swatches{display:flex; flex-wrap:wrap; gap:9px; align-items:center}
.swatch{width:34px; height:34px; padding:0; border-radius:50%; cursor:pointer;
  border:2px solid rgba(0,0,0,.35)}
.swatch[aria-pressed="true"]{outline:2px solid var(--brass); outline-offset:2px}
.upload{display:block; text-align:center}
.linkish{background:none; border:0; padding:10px 0 0; font:inherit; font-size:13px;
  color:var(--mute); text-decoration:underline; cursor:pointer}
.ks-field .count{float:right; font-style:normal}
.problem{color:#E58A8A; font-size:13px; line-height:1.5; margin:8px 0 0}
.actions{display:flex; gap:8px; margin-top:24px}
.actions > *{flex:1}

/* ---------- messages ---------- */
.row .when{flex:none; align-self:flex-start; font-size:12px; color:var(--mute)}
.thread-who{display:flex; align-items:center; gap:12px; padding-bottom:14px;
  margin-bottom:16px; border-bottom:1px solid var(--felt-3)}
.thread-who b{display:block; font-size:15px; font-weight:600}
.thread-who span{display:block; font-size:12.5px; color:var(--mute); margin-top:1px}
.thread{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px}
.msg{max-width:80%; display:flex; flex-direction:column}
.msg p{margin:0; padding:9px 12px; border-radius:14px; font-size:14.5px; line-height:1.45;
  white-space:pre-wrap; overflow-wrap:anywhere}
.msg time{font-size:11px; color:var(--mute); margin-top:3px}
.msg.mine{align-self:flex-end; align-items:flex-end}
.msg.mine p{background:var(--ivory); color:var(--ink); border-bottom-right-radius:4px}
.msg.theirs{align-self:flex-start}
.msg.theirs p{background:var(--felt-3); border-bottom-left-radius:4px}
.thread-empty{color:var(--mute); font-size:13px; text-align:center; padding:28px 0}
.composer{position:fixed; left:0; right:0; bottom:0; z-index:20; background:var(--felt-2);
  border-top:1px solid var(--felt-3);
  padding:10px 16px calc(10px + env(safe-area-inset-bottom))}
.composer > div{max-width:488px; margin:0 auto; display:flex; gap:8px}
.composer input{flex:1; min-width:0; padding:11px 13px; border-radius:3px; font:inherit;
  font-size:16px; background:var(--felt); color:var(--ivory); border:1px solid var(--felt-3)}
.composer input:focus{outline:2px solid var(--brass); outline-offset:1px}
.composer .ks-go{width:auto; padding:0 18px}

/* ---------- dev-only toggle for the client's open question ---------- */
.devbar{position:fixed; z-index:30; left:0; right:0;
  bottom:calc(58px + env(safe-area-inset-bottom));
  display:flex; justify-content:center; pointer-events:none}
.devbar button{pointer-events:auto; font:inherit; font-size:11px; cursor:pointer;
  background:rgba(8,23,19,.94); color:var(--mute); border:1px solid var(--felt-3);
  border-radius:999px; padding:5px 12px; backdrop-filter:blur(6px)}
.devbar button b{color:var(--brass); font-weight:600}
`;
