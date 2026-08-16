{
  "$schema": "text-batch-processor-pack",
  "version": 1,
  "actions": [
    {
      "name": "清洗视频评论格式（含相对时间转换）",
      "category": "数据处理",
      "favorite": false,
      "code": "let result = []; let cleanText = text.replace(/^\\s*共\\d+条回复，\\s*$/gm, ''); let chunks = cleanText.split(/^\\s*回复\\s*$/m); for (let i = 0; i < chunks.length; i++) { let lines = chunks[i].split('\\n').map(l => l.trim()).filter(l => l !== ''); if (lines.length < 3) continue; let timeIdx = -1; for (let j = lines.length - 1; j >= 0; j--) { if (/^(\\d{4}-\\d{2}-\\d{2}\\s\\d{2}:\\d{2}|\\d+(秒|分钟|小时|天)前)$/.test(lines[j])) { timeIdx = j; break; } } if (timeIdx !== -1) { let user = lines[0]; let comment = lines.slice(1, timeIdx).join('\\n'); let time = lines[timeIdx]; let timeMatch = time.match(/^(\\d+)(秒|分钟|小时|天)前$/); if (timeMatch) { let num = parseInt(timeMatch[1]); let unit = timeMatch[2]; let refDate = new Date('2026-08-16T18:51:00'); if (unit === '秒') refDate.setSeconds(refDate.getSeconds() - num); else if (unit === '分钟') refDate.setMinutes(refDate.getMinutes() - num); else if (unit === '小时') refDate.setHours(refDate.getHours() - num); else if (unit === '天') refDate.setDate(refDate.getDate() - num); let yy = refDate.getFullYear(); let mm = String(refDate.getMonth() + 1).padStart(2, '0'); let dd = String(refDate.getDate()).padStart(2, '0'); let hh = String(refDate.getHours()).padStart(2, '0'); let min = String(refDate.getMinutes()).padStart(2, '0'); time = yy + '-' + mm + '-' + dd + ' ' + hh + ':' + min; } let likes = '0'; if (timeIdx < lines.length - 1 && /^\\d+$/.test(lines[timeIdx + 1])) { likes = lines[timeIdx + 1]; } result.push(user + '：（' + time + '）' + comment + '（点赞数：' + likes + '）'); } } return result.join('\\n\\n');"
    }
  ],
  "sequences": [
    {
      "name": "B站评论提取与排版（带时间转换）",
      "category": "数据处理",
      "favorite": false,
      "steps": [
        {
          "actionName": "清洗视频评论格式（含相对时间转换）"
        }
      ]
    }
  ]
}