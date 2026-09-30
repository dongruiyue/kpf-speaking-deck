# lessons/ —— 你的课时数据放这里

每节课一组文件，`<name>` 是课时名（build 时用它）：

```
lessons/<name>.js        课时数据（必填，照 ../templates/lesson.example.js 写）
lessons/<name>.img/      照片（可选，build 时转 base64 内嵌）
lessons/<name>.audio/    录音（可选，mp3 等，同样内嵌）
lessons/<name>.css       课时级 CSS 覆盖（可选）
lessons/<name>.html      课时附带的静态 DOM（可选）
```

快速起步：

```bash
cp ../templates/lesson.example.js demo.js
python3 ../scripts/build.py demo
```

⚠ 这个目录被 `.gitignore` 排除：如果你的课时内容来自出版的课本 / 课件，
**只供本机教学使用，不要提交、不要公开分发**（见 `../references/publishing.md`）。
