# Vial / VIA における複数デバイス選択の調査

調査日: 2026-07-20（UTC）
調査方法: インターネットへ実際に接続し、`git clone` で各公開リポジトリの指定コミットを取得し、`curl` で WebHID 仕様と MDN を参照した。したがって、本書の「出典」節に挙げる資料はすべて**実際に参照した情報**であり（一次・二次の区分は同節に明記）、学習知識だけに依存した主張はない。

> レビュー注記（techmech-keeb 側 / 2026-07-20）: 本書は Codex Cloud が作成した研究成果物。
> 主要4主張（vial-gui の QComboBox 選択・vial-web の `devices.length != 1` 中止・
> VIA の first-device フォールバック・vial_device.py の表示名が UID を含まない点）を
> 指定コミットの実ソースに当てて突き合わせ、いずれも記述どおりであることを確認済み。
> ただし本文の引用行番号は実ファイルと数行ずれる箇所がある（実体は正しい）ため、
> 参照時は該当関数の前後を確認すること。

## 結論

1. **Vial GUI（デスクトップ）は、ウィンドウ上部の `QComboBox` と Refresh ボタンで検出済みデバイスを列挙し、利用者が選べる。** 選択項目は HID の manufacturer string と product string から作り、選択変更時には選択先を開いて各編集タブを再構築する。1 秒間隔の再検出では、同じ HID path の選択を維持するが、永続ストレージへ「最後に選んだキーボード」を保存する実装は本調査範囲では確認できなかった。
   **根拠:** `QComboBox` の生成・シグナル接続、Refresh の配置、`dev.title()` による項目生成、path 一致時の再選択、および `on_device_selected()` の処理を参照した。([`main_window.py` のコンストラクタ／`on_devices_updated`／`on_device_selected`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/main_window.py#L63-L75), [`vial_device.py` の `VialKeyboard.title`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/vial_device.py#L53-L60), [`autorefresh_thread.py` の `update`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/autorefresh/autorefresh_thread.py#L54-L82))
2. **Vial Web はブラウザの chooser に委ね、返却配列がちょうど 1 件のときだけ接続する。** したがって、複数選択を許可した場合にアプリ内でその中から選ぶ UI は確認できず、接続は開始画面へ戻る。
   **根拠:** `requestDevice()` の戻り値が 1 件以外なら return し、1 件目だけを開く実装を参照した。([`vial-web/src/index.html` の `connect`](https://github.com/vial-kb/vial-web/blob/3749f8dabc6d186f9b17cb75eed64e6bf0e23e16/src/index.html#L201-L237))
3. **現在の VIA Web アプリは複数の接続済みデバイスを state に保持する一方、選択がない／切断された場合は最初の有効デバイスを自動選択する。** 本調査したコミットの通常 UI には、利用者が複数台を切り替えるセレクタは確認できなかった。
   **根拠:** `connectedDevices` を path キーの集合として更新し、`selectedDevicePath` が無効なら `validDevicesArr[0]` を選ぶ実装を参照した。([`devicesSlice.ts` の選択 state](https://github.com/the-via/app/blob/6463e399a4f33d932068c326da5d3ca22cd24193/src/store/devicesSlice.ts#L15-L60), [`devicesThunks.ts` の `reloadConnectedDevices`](https://github.com/the-via/app/blob/6463e399a4f33d932068c326da5d3ca22cd24193/src/store/devicesThunks.ts#L106-L226))
4. **本アプリは両経路とも「最初」を採るため、選択モデルを明示的に導入する余地がある。** C# 経路では host が「候補を列挙して UI が index/path を指定して開く」契約にし、WebHID 経路では既許可候補を `getDevices()` でアプリ内リスト化し、未許可候補の追加にはクリックから `requestDevice()` のブラウザ chooser を使う、という二段構えが現実的である。
   **根拠:** 現在の WebHID transport は `getDevices()`／`requestDevice()` の各結果を `_openFirst` へ渡し、C# bridge は列挙結果の index を剰余で開く。WebHID は chooser による明示許可と user activation を規定する。([`ui/vial.js` の `openGranted`／`requestDevice`／`_openFirst`](../../ui/vial.js), [`VialHidBridge.cs` の `open`](../../kiosk/VialHidBridge.cs), [WebHID 仕様 §6.1–6.2](https://wicg.github.io/webhid/#hid-interface))

## 根拠と比較

### 1. Vial GUI（デスクトップ版 `vial-gui`）

#### 検出・列挙と表示名

* `find_vial_devices()` は hidapi の全列挙結果から、Vial serial magic、Vial bootloader magic、または VIA 定義に合う機器を候補にし、Raw HID の top-level usage page `0xFF60`／usage `0x61` を確認する。([`util.py` の `find_vial_devices` と `is_rawhid`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/util.py#L55-L115))
* 通常の Vial キーボードの表示名は `manufacturer_string + product_string`（前後空白を除去）であり、sideload は ` [sideload]`、VIA 定義経由は ` [VIA]` を追加する。ブートローダーは `Vial Bootloader [VID:PID]` で表示する。([`vial_device.py` の `VialKeyboard.title`／`VialBootloader.title`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/vial_device.py#L53-L75))
* 同名・同 VID/PID の複数台を区別するための serial、path、UID をタイトルへ付加する処理は、この `title()` 実装にはない。これはコードの確認結果であり、UI 上で実機区別できるかは manufacturer/product string の差に依存する。([`vial_device.py` の `VialKeyboard.title`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/vial_device.py#L53-L60))

#### 選択・切替・記憶

* UI はドロップダウン（Qt `QComboBox`）で、選択変更を `on_device_selected` に接続し、横に手動 Refresh ボタンを置く。([`main_window.py` の UI 構築](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/main_window.py#L63-L75))
* デバイス集合が変化するとコンボボックスを作り直すが、現在のデバイスと同じ HID `path` が残っていればその index を選び直す。集合に変化がなければ更新を省略し、バックグラウンド thread は毎秒 `update()` を行う。([`main_window.py` の `on_devices_updated`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/main_window.py#L289-L307), [`autorefresh_thread.py` の `run`／`update`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/autorefresh/autorefresh_thread.py#L28-L82))
* 選択時は `select_device(currentIndex)`、Vial UID の注意表示、`rebuild()`、タブの再表示を実行する。選択切替は単に通信先を替えるだけでなく、対象機の機能に合わせて編集 UI を再構築する挙動である。([`main_window.py` の `on_device_selected`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/main_window.py#L309-L327))
* `QSettings("Vial", "Vial")` で保存していることを確認できるのはウィンドウ size、position、maximized などである。最後に選んだ device path/UID を設定へ保存・復元するコードは、本調査で参照した `main_window.py` と `autorefresh_thread.py` では**未確認**である。([`main_window.py` の QSettings 読み込み](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/main_window.py#L45-L61), [`autorefresh_thread.py` の状態管理](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/autorefresh/autorefresh_thread.py#L18-L35))

### 2. Vial Web と VIA

#### Vial Web

* 「Start Vial」のクリックから `navigator.hid.requestDevice({filters: [{usagePage: 0xFF60, usage: 0x61}]})` を呼ぶため、候補の表示・許可は WebHID 対応ブラウザの chooser が担う。([`vial-web/src/index.html` の `connect`](https://github.com/vial-kb/vial-web/blob/3749f8dabc6d186f9b17cb75eed64e6bf0e23e16/src/index.html#L201-L213), [WebHID 仕様 §6.2.1 の filters](https://wicg.github.io/webhid/#hiddevicerequestoptions-dictionary))
* 同実装は `devices.length != 1` で接続を中止するため、複数を chooser で選んだ場合に製品内リストから選ぶ設計ではない。1 件なら `devices[0]` を open し、その `productName` を device descriptor の `product_string` に使う。([`vial-web/src/index.html` の `connect` と descriptor 作成](https://github.com/vial-kb/vial-web/blob/3749f8dabc6d186f9b17cb75eed64e6bf0e23e16/src/index.html#L206-L237))

#### VIA

* VIA はスキャンした機器を path ごとの `connectedDevices` に保持し、選択対象を `selectedDevicePath` として別管理する。([`devicesSlice.ts` の `DevicesState`／`selectDevice`／`updateConnectedDevices`](https://github.com/the-via/app/blob/6463e399a4f33d932068c326da5d3ca22cd24193/src/store/devicesSlice.ts#L15-L60))
* スキャンでは対応 VID/PID（または強制許可）と接続可否で候補を絞り、VIA protocol version と定義解決を行った後に接続済み集合へ入れる。([`hid-keyboards.ts` の `getRecognisedDevices`](https://github.com/the-via/app/blob/6463e399a4f33d932068c326da5d3ca22cd24193/src/utils/hid-keyboards.ts#L23-L32), [`devicesThunks.ts` の `reloadConnectedDevices`](https://github.com/the-via/app/blob/6463e399a4f33d932068c326da5d3ca22cd24193/src/store/devicesThunks.ts#L116-L207))
* 現在の選択 path がなければ最初の有効デバイスを `selectConnectedDevice` する。`selectedDevicePath` が残っている場合はその選択を保つため、同じセッションでは接続順の変化だけで他機へ切り替えない。永続化は `TODO` コメントで検討対象とされており、この経路の選択を local storage 等に保存する実装は確認できない。([`devicesThunks.ts` の first-device fallback と TODO](https://github.com/the-via/app/blob/6463e399a4f33d932068c326da5d3ca22cd24193/src/store/devicesThunks.ts#L110-L226))

### 3. WebHID API の制約と永続許可

* `navigator.hid.getDevices()` は、当該 origin が過去の `requestDevice()` によりアクセスを許可された**接続中** HID device のリストを返す。従って、これは無許可の接続デバイスを発見する API ではなく、再接続時に既許可候補を製品 UI へ出す土台である。([MDN, `HID.getDevices()`](https://developer.mozilla.org/en-US/docs/Web/API/HID/getDevices), [WebHID 仕様 §6.1](https://wicg.github.io/webhid/#getdevices-method))
* `navigator.hid.requestDevice()` はアクセスを要求する API で、仕様上 transient user activation がない呼出しは `SecurityError` になる。フィルタは chooser に出す候補を絞るものであり、ユーザーが選択した device がページに公開される。([MDN, `HID.requestDevice()`](https://developer.mozilla.org/en-US/docs/Web/API/HID/requestDevice), [WebHID 仕様 §6.2](https://wicg.github.io/webhid/#requestdevice-method), [WebHID 仕様の chooser と filters](https://wicg.github.io/webhid/#security-and-privacy-considerations))
* 仕様はアクセス許可後の機器を `getDevices()` で返す設計で、`HIDDevice.forget()` によりアクセス許可を破棄できる。アプリ固有の「最後の選択」をブラウザが記憶するものではないため、選択復元を望む場合はアプリ側が識別子を保存し、毎回 `getDevices()` の現存候補に照合する必要がある。([WebHID 仕様 §6.1](https://wicg.github.io/webhid/#getdevices-method), [WebHID 仕様 §7.3 `forget()`](https://wicg.github.io/webhid/#forget-method))
* `HIDDevice` から直接得られる表示用情報は `productName`、識別補助は `vendorId`／`productId`／collections である。serial number は WebHID の `HIDDevice` interface に含まれないため、同型機の確実な区別は Vial 応答から読む UID を使う方がよい。([WebHID 仕様の `HIDDevice` IDL](https://wicg.github.io/webhid/#hiddevice-interface), [`ui/vial.js` の `readVialInfo` が UID を読む実装](../../ui/vial.js))

## 当アプリへの適用案（実装しない比較）

### 共通の UI・識別方針

* **推奨 UI:** 既存の VIAL 接続状態を示すスタッフメニュー内に「接続キーボード」セレクト（通常時は接続名、複数時は選択を必須または明示）と「再スキャン／接続を追加」を置く。展示の主画面を増やさず、Vial GUI のドロップダウン型に近い操作にできる。Vial GUI は実際に `QComboBox` + Refresh でこの役割を担う。([`vial-gui/main_window.py` の device combo と Refresh](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/main_window.py#L63-L75))
* **表示名の優先順位:** (1) Vial `vial_get_keyboard_id` の UID に `boards.js` の登録名があればそのボード名、(2) USB/HID product name、(3) `VID:PID`、(4) UID の短縮 hex を重ねる。product 名だけの Vial GUI 方式は同型機を区別できないため、UID の併記で曖昧さをなくす。Vial プロトコルから UID を読む現行処理と、host の product/VID/PID 返信は既に存在する。([`ui/vial.js` の `readVialInfo`](../../ui/vial.js), [`VialHidBridge.cs` の open reply](../../kiosk/VialHidBridge.cs))
* **切替時の共通手順:** 旧 transport の matrix poll と disconnect listener を止めて close → 新候補を open → Vial 応答と UID を確認 → board profile、レイヤー、keymap、matrix 状態を初期化して再読込する。これは Vial GUI が選択後に UI を `rebuild()` すること、現行 transport が disconnect listener と `close()` を持つことに沿う。([`vial-gui/main_window.py` の `on_device_selected`／`rebuild`](https://github.com/vial-kb/vial-gui/blob/aef8222a2d0429a183b2ed692d5f9efcfd383f08/src/main/python/main_window.py#L309-L327), [`ui/vial.js` の WebHidTransport `close`](../../ui/vial.js))

### ① C# ホスト経由 Raw HID

| 候補 | 方針 | 利点 | 注意点 |
| --- | --- | --- | --- |
| A. 列挙 API を bridge に追加して UI 選択（**推奨**） | `RawHidDevice.EnumeratePaths()` の各 path を実際に open/probe し、`path`（内部用）、product、VID/PID を配列で返す。UI が候補ごとに Vial ID を照会後、選んだ安定キーを指定して open する。 | host が OS path を握ったまま、UI は名前と UID を使って選べる。現行の index 剰余選択を排除でき、同型機も判別できる。 | Vial 応答確認は候補ごとに短いタイムアウトを設ける。path は抜き差しで変わり得るため、永続キーにしない。現行 `EnumeratePaths()` は path のみを返し、bridge は index を `% paths.Count` して開く。([`RawHidDevice.cs` の `EnumeratePaths`](../../kiosk/RawHidDevice.cs), [`VialHidBridge.cs` の `open`](../../kiosk/VialHidBridge.cs)) |
| B. host 側が Vial 検証済み候補を返す | C# が open → `0xFE 0x00` 応答まで検証し、Vial UID を含む候補一覧だけを UI に返す。 | UI 実装は単純で、「Vial 応答した機器」だけを表示できる。 | protocol logic を UI に置く現設計から外れ、JS/C# の Vial 実装が重複する。現行コメントは host を dumb pipe、UI を protocol owner と明記しているため、A より設計変更が大きい。([`RawHidDevice.cs` のクラス説明](../../kiosk/RawHidDevice.cs), [`VialHidBridge.cs` のクラス説明](../../kiosk/VialHidBridge.cs)) |

**記憶案（C# 経路）:** `localStorage` に最後に選んだ Vial UID を保存し、起動時の候補検証後に UID が一意に一致したときだけ自動選択する。一致しない／複数不正なら未選択に戻してスタッフが選ぶ。OS path や列挙 index は再接続で安定しないため保存しない。UID は現行 Vial 応答で読める。([`ui/vial.js` の `readVialInfo`](../../ui/vial.js), [`VialHidBridge.cs` の `open` が index を使う現状](../../kiosk/VialHidBridge.cs))

### ② ブラウザ WebHID

| 候補 | 方針 | 利点 | 注意点 |
| --- | --- | --- | --- |
| A. 既許可リスト + chooser 追加（**推奨**） | 起動時は `getDevices()` で既許可・接続中の候補を列挙し、staff UI で一台を開く。「接続を追加」クリック時だけ `requestDevice({filters})` を呼び、chooser から許可された候補をリストに反映する。 | WebHID の権限・user gesture 制約を守りつつ、複数台をアプリ内で明示選択できる。既許可機はクリックなしで再検出できる。 | chooser の見え方・複数選択の可否はブラウザ実装に委ねるため、アプリは戻り配列の全候補を扱い、選択 UI を必ず持つ。`requestDevice()` は user activation 必須。([WebHID 仕様 §6.1–6.2](https://wicg.github.io/webhid/#hid-interface), [`ui/vial.js` の現行 first-device 処理](../../ui/vial.js)) |
| B. 毎回 browser chooser のみ | 「接続」クリックごとに `requestDevice()` を実行し、ブラウザで一台選ばせる。 | アプリ内の候補管理が最小になる。 | 既許可候補の切替、同型機の UID 表示、最後の選択の復元を提供しにくい。Vial Web の現行版は複数結果を受け付けず、これをそのまま採用すると課題を解決しない。([`vial-web/src/index.html` の `connect`](https://github.com/vial-kb/vial-web/blob/3749f8dabc6d186f9b17cb75eed64e6bf0e23e16/src/index.html#L201-L237)) |

**記憶案（WebHID）:** `localStorage` には Vial UID（必要なら `vendorId:productId` を補助）だけを保存し、`getDevices()` の各候補を一時 open して UID を照合してから復元する。ブラウザの permission は origin ごとで、アプリの最終選択そのものを保存する API ではない。ユーザーが許可を撤回した場合は `getDevices()` に現れないので、未選択状態と「接続を追加」を示す。([MDN, `HID.getDevices()`](https://developer.mozilla.org/en-US/docs/Web/API/HID/getDevices), [WebHID 仕様 §7.3 `forget()`](https://wicg.github.io/webhid/#forget-method), [`ui/vial.js` の UID 読み出し](../../ui/vial.js))

## 現行実装との差分（調査結果）

* WebHID は `getDevices()` と `requestDevice()` のいずれでも候補を `_openFirst()` に渡し、usage に合致した先頭だけを open する。複数候補の名前・UID を UI へ返す処理はない。([`ui/vial.js` の `WebHidTransport`](../../ui/vial.js))
* C# bridge は Raw HID path を全列挙するが、UI から受けた `index` を `index % paths.Count` にして開く。候補名の一覧や path を UI へ返さず、open 成功後の単一 product/VID/PID と総数だけを返す。([`VialHidBridge.cs` の `open`](../../kiosk/VialHidBridge.cs), [`RawHidDevice.cs` の `EnumeratePaths`](../../kiosk/RawHidDevice.cs))
* README も「Vial 応答した最初のデバイスへ接続」と明記しており、今回の課題認識と現実装は一致する。([`README.md` の「Vial連携 / 取得している情報」](../../README.md))

## 出典一覧と参照種別

| 出典 | 種別 | 実際に参照した範囲 | 用途 |
| --- | --- | --- | --- |
| [`vial-kb/vial-gui` commit `aef8222`](https://github.com/vial-kb/vial-gui/tree/aef8222a2d0429a183b2ed692d5f9efcfd383f08) | 一次情報（公開ソース） | `main_window.py`、`autorefresh/autorefresh_thread.py`、`vial_device.py`、`util.py` | デスクトップ Vial の列挙・表示名・切替 |
| [`vial-kb/vial-web` commit `3749f8d`](https://github.com/vial-kb/vial-web/tree/3749f8dabc6d186f9b17cb75eed64e6bf0e23e16) | 一次情報（公開ソース） | `src/index.html` | Web 版 Vial の chooser と 1 件制約 |
| [`the-via/app` commit `6463e39`](https://github.com/the-via/app/tree/6463e399a4f33d932068c326da5d3ca22cd24193) | 一次情報（公開ソース） | `src/store/devicesSlice.ts`、`src/store/devicesThunks.ts`、`src/utils/hid-keyboards.ts` | VIA の複数接続 state と first-device fallback |
| [WebHID Community Group Report](https://wicg.github.io/webhid/) | 一次情報（仕様） | §6.1、§6.2、§6.2.1、§7.3、Security and Privacy Considerations | 許可、chooser、user activation、forget |
| [MDN `HID.getDevices()`](https://developer.mozilla.org/en-US/docs/Web/API/HID/getDevices)、[MDN `HID.requestDevice()`](https://developer.mozilla.org/en-US/docs/Web/API/HID/requestDevice) | 二次情報（仕様 API リファレンス） | 各 API ページ | 仕様の実用的な要約の相互確認 |
| 本リポジトリ | 一次情報（対象実装） | `ui/vial.js`、`kiosk/RawHidDevice.cs`、`kiosk/VialHidBridge.cs`、`README.md` | 現状との差分と適用案 |

学習知識のみを根拠にした出典は**なし**。ブラウザ実装差（chooser の具体的な複数選択操作や表示名）は WebHID 仕様で固定されないため、本書では断定せず、ブラウザ実機での要確認事項として扱った。
