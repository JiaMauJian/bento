// 從花梅蘭的訂餐網站抓每日菜單，更新 index.html 和 menu.html 裡 hua-days 標記之間的資料。
// 用法：node tools/hua-menu.js
// 店家換新月份菜單後跑一次，再檢查 git diff。

var fs = require("fs");
var path = require("path");
var URL = "https://monumental-sprinkles-8912d9.netlify.app/";
var ROOT = path.join(__dirname, "..");
var START = "/* hua-days:start */", END = "/* hua-days:end */";

function parseMenu(html){
  var i = html.indexOf("let MENU=");
  if(i < 0) throw new Error("店家網頁裡找不到 MENU，網站可能改版了");
  var depth = 0, j = i + 9;
  for(; j < html.length; j++){
    if(html[j] === "{") depth++;
    if(html[j] === "}" && --depth === 0) break;
  }
  return Function("return (" + html.slice(i + 9, j + 1) + ")")();
}

// 「・小／・大」合成一個品項兩種份量；飲料去掉「飲料」前綴
function mergeSizes(list){
  var out = [];
  list.forEach(function(x){
    var name = x[0].replace(/^飲料\s*/, ""), m = name.match(/^(.*)・(小|大)$/), base = m ? m[1] : name;
    var it = out.find(function(o){ return o.name === base; });
    if(!it){ it = { name: base, v: [] }; out.push(it); }
    it.v.push({ size: m ? m[2] : "", price: x[1] });
  });
  return out;
}

function dayGroups(v){
  var food = v.food || [], extra = (v.extra || []).map(function(x){ return [x[0], x[1]]; });
  // 原始資料偶爾把單點放在便當裡
  extra = extra.concat(food.filter(function(x){ return /單點/.test(x[0]); }));
  food = food.filter(function(x){ return !/單點/.test(x[0]); });
  return [
    { key: "f", title: "便當", items: mergeSizes(food) },
    { key: "e", title: "單點", nocount: true, items: mergeSizes(extra) },
    { key: "d", title: "飲料", nocount: true, items: mergeSizes(v.drink || []) }
  ].filter(function(g){ return g.items.length; });
}

var q = JSON.stringify;

function forIndex(date, groups){
  var md = date.slice(5).replace("-", "");
  return groups.map(function(g){
    var items = g.items.map(function(it, k){
      var v = it.v.map(function(s){ return [s.size === "小" ? "a" : s.size === "大" ? "b" : "x", s.size, s.price]; });
      return "{ id: " + q("h" + md + g.key + (k + 1)) + ", name: " + q(it.name) + ", v: " + q(v) + " }";
    });
    return "{ title: " + q(g.title) + (g.nocount ? ", nocount: 1" : "") + ", items: [\n          " + items.join(",\n          ") + "\n        ]}";
  });
}

function forMenu(date, groups){
  return groups.map(function(g){
    var items = g.items.map(function(it){
      return "{ name: " + q(it.name) + ", v: " + q(it.v.map(function(s){ return [s.size, s.price]; })) + " }";
    });
    return "{ title: " + q(g.title) + (g.nocount ? ", sub: \"不算外送份數\"" : "") + ", items: [\n          " + items.join(",\n          ") + "\n        ]}";
  });
}

function block(menu, fmt){
  return Object.keys(menu).filter(function(d){ return !menu[d].closed; }).map(function(d){
    return "      " + q(d) + ": [\n        " + fmt(d, dayGroups(menu[d])).join(",\n        ") + "\n      ]";
  }).join(",\n");
}

function patch(file, body){
  var p = path.join(ROOT, file), src = fs.readFileSync(p, "utf8");
  var a = src.indexOf(START), b = src.indexOf(END);
  if(a < 0 || b < a) throw new Error(file + " 裡找不到 hua-days 標記");
  fs.writeFileSync(p, src.slice(0, a + START.length) + "\n" + body + "\n      " + src.slice(b));
}

fetch(URL).then(function(r){ return r.text(); }).then(function(html){
  var menu = parseMenu(html), days = Object.keys(menu);
  patch("index.html", block(menu, forIndex));
  patch("menu.html", block(menu, forMenu));
  console.log("已更新 " + days[0] + " ～ " + days[days.length - 1] + "，共 " + days.length + " 天（含店休）");
}).catch(function(e){ console.error(e.message); process.exit(1); });
