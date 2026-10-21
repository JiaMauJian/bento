# 團體訂便當

同事打開網址就能點餐，不用登入。整個網站只有一個 `index.html`，放在 GitHub Pages；訂單存在 Firebase 即時資料庫，大家的畫面會即時同步。

## 一、建立資料庫（Firebase，免費）

1. 到 <https://console.firebase.google.com/> 用 Google 帳號登入，點「建立專案」，名稱例如 `bento`，Google Analytics 可以關掉。
2. 左側選單「建構 > Realtime Database」，點「建立資料庫」，位置選「新加坡 (asia-southeast1)」，模式選哪個都可以。
3. 建好後到「規則」分頁，整段換成下面這樣，按「發布」：

   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

4. 回到「資料」分頁，複製上方的網址（像 `https://bento-xxxx-default-rtdb.asia-southeast1.firebasedatabase.app`）。

## 二、設定前端

用記事本打開 `index.html`，把這一行的文字換成剛剛複製的網址：

```js
var DB_URL = "請貼上 Firebase 即時資料庫網址";
```

## 三、放到 GitHub Pages

1. 把 `index.html`（和 `menu.html`）上傳到一個 Public repo。
2. 到 repo 的「Settings > Pages」，Source 選「Deploy from a branch」，Branch 選 `main`、資料夾選 `/ (root)`，按「Save」。
3. 等一兩分鐘，頁面上方會出現網址：`https://你的帳號.github.io/bento/`，丟到群組就可以了。

## 使用方式

- **開單**：沒開單時頁面最上面就是選店家，選好店家和截止時間按「開始收單」。開單後，截止時間、結單、開新一輪的按鈕在頁面最下面。誰都可以操作。
- **點餐**：填名字、點餐、送出。同一個瀏覽器可以回來修改或取消，換手機或換瀏覽器就改不到原本那筆。
- **付款**：每個人旁邊有「已付」可以勾。

## 注意

- 沒有密碼，資料庫網址也寫在公開的 `index.html` 裡，所以任何拿到網址的人都能改訂單。同事之間用沒問題，不要拿來放敏感資料。
- 截止時間是各自的瀏覽器判斷的，請大家手機時間不要亂調。
- 訂單會保留到開單日的 3 天後，之後第一個打開頁面的人會自動把它清掉（天數改 `index.html` 的 `KEEP_DAYS`）。想提早清可以按「開新一輪」。
- 訂單也可以直接在 Firebase 主控台的「資料」分頁查看或修改。

## 更新花梅蘭的每月菜單

花梅蘭每天菜單不同，資料是從店家的訂餐網站抓下來的。店家換新月份菜單後，在這個資料夾執行：

```sh
node tools/hua-menu.js
```

它會同時更新 `index.html` 和 `menu.html`，跑完看一下 `git diff` 再 commit。沒列到的日期就是店休，那天不能開花梅蘭的單。
