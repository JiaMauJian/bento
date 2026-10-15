# 團體訂便當

同事打開網址就能點餐，不用登入。前端放在 GitHub Pages，訂單資料存在你的 Google 試算表。

## 一、建立後端（Google 試算表＋Apps Script）

1. 到 Google 雲端硬碟新增一份空白試算表，取名例如「訂便當」。
2. 在試算表點「擴充功能 > Apps Script」，把編輯器裡原本的內容全部刪掉，貼上 `Code.gs` 的內容，按儲存。
3. 點左側齒輪「專案設定」：
   - 時區選「(GMT+08:00) 台北」。
   - 往下找到「指令碼屬性」，新增一筆：屬性 `ADMIN_PASSWORD`，值填你自己想的主揪密碼。
4. 點右上角「部署 > 新增部署作業」，類型選「網頁應用程式」：
   - 執行身分：我
   - 誰可以存取：所有人
5. 按「部署」，第一次會要求授權，照畫面允許即可。
6. 複製畫面上的「網頁應用程式網址」（`https://script.google.com/macros/s/.../exec`）。

> 之後如果有修改 `Code.gs`，要到「部署 > 管理部署作業」編輯現有部署並選「新版本」，網址才會維持不變。

## 二、設定前端

用記事本打開 `index.html`，把開頭這一行的文字換成剛剛複製的網址：

```js
var API_URL = "請貼上 Apps Script 網頁應用程式網址";
```

付款：頁面上只顯示金額，付款方式由主揪在 LINE 群組說明。

## 三、放到 GitHub Pages

1. 登入 GitHub，右上角「+ > New repository」，名稱例如 `bento`，選 **Public**，按「Create repository」。
2. 在新 repo 頁面點「uploading an existing file」，把 `index.html` 拖進去，按「Commit changes」。
3. 到 repo 的「Settings > Pages」，Source 選「Deploy from a branch」，Branch 選 `main`、資料夾選 `/ (root)`，按「Save」。
4. 等一兩分鐘，頁面上方會出現網址：`https://你的帳號.github.io/bento/`，把它丟到群組就可以了。

## 使用方式

- **主揪**：打開網址，捲到最下面點「主揪登入」，輸入密碼。同一個瀏覽器之後會記住，不用每次輸入。
- **同事**：打開網址、填名字、點餐、送出。同一個瀏覽器可以回來修改或取消，換手機或換瀏覽器就改不到原本那筆。

## 注意

- Public repo 代表 `index.html` 任何人都看得到。密碼不在這個檔案裡，存在 Apps Script 的指令碼屬性中。
- 不用登入的代價是只能靠同事自己填的名字認人，請大家填認得出來的名字。
- 訂單明細也可以直接在 Google 試算表的 `orders` 工作表查看。
