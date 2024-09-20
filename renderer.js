const { ipcRenderer } = require("electron");

// 出力エリアの要素を取得
const cmdOutput = document.getElementById("cmd-output");
const cmdInput = document.getElementById("cmd-input");

let currentDirectory = 'C:\\'; // 現在のディレクトリを保持する変数

// プロンプトを更新する関数
function updatePrompt(newDirectory) {
  currentDirectory = newDirectory;
  const promptElement = document.getElementById('cmd-prompt');
  if (promptElement) {
    promptElement.textContent = `${currentDirectory}> `;
  }
}

// 初期プロンプトを設定
updatePrompt(currentDirectory);

// コマンドの結果を出力エリアに追加し、スクロールを下に移動
function addOutput(text) {
  cmdOutput.textContent += text + "\n"; // 出力を追加
  cmdOutput.scrollTop = cmdOutput.scrollHeight; // 最後の行にスクロール
  cmdInput.focus(); // 入力フィールドにフォーカス
}

// 例: コマンド結果を受け取ったときの処理
ipcRenderer.on("command-result", (event, result) => {
  if (result.stdout) addOutput(result.stdout);
  if (result.stderr) addOutput(result.stderr);
  // if (result.error) addOutput(result.error);
});

// 初期フォーカスを入力フィールドに設定
cmdInput.focus();

cmdInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    const command = cmdInput.value.trim();
    if (command) {
      addOutput(`${currentDirectory}> ${command}`);
      ipcRenderer.send("run-command", command);
    }
    cmdInput.value = "";
  }

  if (event.key === "Tab") {
    event.preventDefault(); // デフォルトのタブ挿入動作をキャンセル

    // 現在の入力値を取得
    const input = cmdInput.value.trim();
    const lastPart = input.split(" ").pop(); // 最後の単語を取得（フォルダ名の一部など）

    // 入力された部分をベースに候補を取得
    const suggestions = getSuggestions(lastPart);

    // 候補が見つかった場合、自動補完
    if (suggestions.length === 1) {
      const suggestion = suggestions[0];
      cmdInput.value =
        input.substring(0, input.lastIndexOf(lastPart)) + suggestion;
    } else if (suggestions.length > 1) {
      // 候補が複数ある場合、出力欄に候補を表示（デバッグ用）
      console.log("候補:", suggestions.join(" "));
    }
  }
});

// ディレクトリ変更を受け取るIPC通信
ipcRenderer.on('directory-changed', (event, newDirectory) => {
  updatePrompt(newDirectory);
});

// 出力を追加する関数（変更なし）
function addOutput(text) {
  const cmdOutput = document.getElementById("cmd-output");
  cmdOutput.textContent += text + "\n";
  cmdOutput.scrollTop = cmdOutput.scrollHeight;
}
