const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
const { exec } = require("child_process");
const iconv = require('iconv-lite');
const path = require("path");

let currentDirectory = 'C:\\'; // 初期ディレクトリを設定
let win; // グローバルに win を定義

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      experimentalFeatures: true, // Enable experimental features
      webSecurity: true, // Enable web security
    },
  });

  win.loadFile("index.html");
  // win.webContents.openDevTools(); // デバッグ用に DevTools を開く
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on('run-command', (event, command) => {
  // コマンドの処理
  exec(command, { encoding: 'buffer', cwd: currentDirectory, shell: 'cmd.exe' }, (error, stdout, stderr) => {
    const encoding = 'Shift_JIS';
    let output = iconv.decode(stdout, encoding);
    let errorOutput = iconv.decode(stderr, encoding);

    // cdコマンドが実行された場合、カレントディレクトリを更新
    if (!error) {
      const cdCommandMatch = command.match(/^cd\s+(.+)/i);
      if (cdCommandMatch) {
        // ディレクトリ変更
        const newDirectory = cdCommandMatch[1].replace(/"/g, ''); // "が含まれる場合は削除
        try {
          const absolutePath = path.resolve(currentDirectory, newDirectory);
          if (fs.existsSync(absolutePath)) {
            currentDirectory = absolutePath;
            // ディレクトリ変更後にメッセージを送信
            win.webContents.send('directory-changed', currentDirectory); // win が定義されていることを確認
          }
        } catch (e) {
          console.error('Invalid path:', e);
        }
      }
    }

    const result = {
      command,
      stdout: output,
      stderr: errorOutput,
      error: error ? error.message : null,
      cwd: currentDirectory, // カレントディレクトリを結果に含める
    };
    logCommand(result); // コマンドと結果をファイルにログ
    event.reply('command-result', result);
  });
});

function logCommand(log) {
  const logPath = path.join(__dirname, "command-log.txt");
  const logEntry = `${new Date().toISOString()} - Command: ${log.command}\nOutput: ${log.stdout}\nError: ${log.stderr}\n\n`;
  fs.appendFile(logPath, logEntry, (err) => {
    if (err) console.error("Error writing to log file", err);
  });
}

// 現在のコードページを取得する
function getCodePage(callback) {
  exec('chcp', { encoding: 'buffer', shell: 'cmd.exe' }, (error, stdout, stderr) => {
    if (error) {
      callback('Shift_JIS'); // デフォルトはShift_JISとする
      return;
    }
    // 出力例: "Active code page: 932"
    const codePageOutput = iconv.decode(stdout, 'cp437'); // cp437 でデコード
    const match = codePageOutput.match(/Active code page: (\d+)/);
    if (match) {
      const codePage = match[1];
      let encoding;
      if (codePage === '65001') {
        encoding = 'utf8'; // UTF-8 の場合
      } else if (codePage === '932') {
        encoding = 'Shift_JIS'; // Shift_JIS の場合
      } else {
        encoding = 'Shift_JIS'; // その他のコードページはとりあえずShift_JISとする
      }
      console.log(`Current encoding: ${encoding}`); // 現在のエンコーディングを表示
      callback(encoding);
    } else {
      callback('Shift_JIS'); // デフォルト
    }
  });
}
