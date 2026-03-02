# 夜晚仪式配音规范（中文版）

## 配音风格
- **语气：** 平静、庄重、舒缓——如同引导仪式的旁白者
- **语速：** 缓慢而清晰；短语之间留有自然停顿
- **音量：** 所有文件保持一致（建议响度标准化至 -14 LUFS 或相近值）
- **语言：** 普通话（简体中文）

## 输出格式
- 格式：MP3
- 采样率：44100 Hz
- 比特率：128 kbps 或更高
- 文件命名：与下表完全一致（区分大小写）
- 将文件放入此目录（`client/public/assets/audio/night/zh/`）

---

## 文件列表

| 文件名 | 台词 |
|--------|------|
| `01-close-eyes.mp3` | "所有人，请闭上眼睛，握拳伸出。" |
| `02-minions-open-std.mp3` | "莫德雷德的爪牙们，请睁开眼睛，环顾四周，认清你们的同伴。" |
| `02-minions-open-excl-oberon.mp3` | "莫德雷德的爪牙们——奥伯龙除外——请睁开眼睛，环顾四周，认清你们的同伴。" |
| `02b-minions-close.mp3` | "莫德雷德的爪牙们，请闭上眼睛。" |
| `03-minions-thumbs-std.mp3` | "莫德雷德的爪牙们，请举起大拇指，让梅林看到你们。" |
| `03-minions-thumbs-excl-oberon.mp3` | "莫德雷德的爪牙们——奥伯龙除外——请举起大拇指，让梅林看到你们。" |
| `03-minions-thumbs-excl-mordred.mp3` | "莫德雷德的爪牙们——莫德雷德除外——请举起大拇指，让梅林看到你们。" |
| `03-minions-thumbs-excl-mordred-oberon.mp3` | "莫德雷德的爪牙们——莫德雷德和奥伯龙除外——请举起大拇指，让梅林看到你们。" |
| `04-merlin-open.mp3` | "梅林，请睁开眼睛。举起大拇指的人，都属于邪恶阵营。" |
| `05-merlin-close.mp3` | "梅林，请闭上眼睛。爪牙们，请放下大拇指。" |
| `06-percival-thumbs-no-morgana.mp3` | "梅林，请举起大拇指。" |
| `06-percival-thumbs-with-morgana.mp3` | "梅林和莫甘娜，请举起大拇指。" |
| `07-percival-open.mp3` | "帕西法尔，请睁开眼睛。在举起的大拇指中，找到梅林。" |
| `08-percival-close-no-morgana.mp3` | "帕西法尔，请闭上眼睛。梅林，请放下大拇指。" |
| `08-percival-close-with-morgana.mp3` | "帕西法尔，请闭上眼睛。梅林和莫甘娜，请放下大拇指。" |
| `09-wake-up.mp3` | "所有人，请睁开眼睛。白天开始了。" |

---

## 备注
- `02` 有两个变体（`std` 与 `excl-oberon`），根据是否选入奥伯龙自动选择。
- `02b` 在 `02` 之后必须播放（爪牙睁眼认人后，需闭眼再为梅林举拇指）。
- `03` 有四个变体，根据莫德雷德和奥伯龙的选入情况决定：`std`、`excl-oberon`、`excl-mordred`、`excl-mordred-oberon`。莫德雷德被排除是因为梅林本就知晓其身份。
- `06`、`08` 各有两个变体（`no-morgana` 与 `with-morgana`），仅在选入帕西法尔时使用。
- `01` 始终最先播放；`09` 始终最后播放。
- 文件缺失时会自动降级为计时器推进，可分批录制生成。

---

## 角色名称对照

| 英文 | 中文 |
|------|------|
| Merlin | 梅林 |
| Mordred | 莫德雷德 |
| Oberon | 奥伯龙 |
| Morgana | 莫甘娜 |
| Percival | 帕西法尔 |
| Assassin | 刺客 |
| Minions of Mordred | 莫德雷德的爪牙 |
