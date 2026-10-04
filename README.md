# 租金計算器（GitHub Pages 版）

這是現有租金計算器的完整靜態網站。水費用量、單價與金額由使用者手填，電費按讀數計算。2 樓樓梯燈費預設為 $0。iPhone/iPad 可透過分享選單或長按圖片存入「照片」App。上傳到 GitHub Pages 後，網址不再使用 chatgpt.site。

租單圖片採用已確認的紙本收據版式：白底宋體、合併租住日期及大寫金額欄、框內備註和經手人位置。金額、讀數及月份按輸入產生；編號及經手人留空，不複製參考照片的樣本編號或簽名。

## 發佈步驟

1. 登入 GitHub，建立一個 **Public** repository，名稱可用 `rent-calculator`。
2. 在該 repository 選 **Add file → Upload files**，將本資料夾內的 `index.html`、`app.js`、`style.css`、`sw.js`、`manifest.webmanifest`、兩個 PNG 圖示和 `README.md` 全部上傳到 repository 根目錄，然後按 **Commit changes**。不要只上傳 ZIP 檔。
3. 到 **Settings → Pages**。在 **Build and deployment** 選 **Deploy from a branch**，branch 選 `main`，folder 選 `/(root)`，按 **Save**。
4. 網址通常是 `https://你的帳戶.github.io/rent-calculator/`。到 Settings → Pages 查看實際網址，然後請收件人在所在地以 Wi-Fi 和流動數據各試一次。
5. 收件人在 iPhone/iPad Safari 開啟網站，按分享 → 加入主畫面。首次開啟要連線；之後可離線計算及製作圖片。

## 注意

- 網站程式碼會在公開 repository 可見；實際輸入的租單讀數只存在使用者自己的裝置瀏覽器，不會上傳到 GitHub。
- 新網址屬另一個網站，原本 `chatgpt.site` 上已儲存的讀數不會自動搬過來。首次使用請重新輸入上月讀數。
- GitHub Pages 能否在對方所在地穩定開啟，必須由對方實測。
