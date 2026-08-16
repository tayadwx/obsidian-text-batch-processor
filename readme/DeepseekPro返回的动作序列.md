{
  "$schema": "text-batch-processor-pack",
  "version": 1,
  "actions": [
    {
      "name": "清洗视频评论为标准格式",
      "category": "视频评论清洗",
      "favorite": false,
      "code": "const lines=text.split('\\n');const baseTime=Date.UTC(2026,7,16,18,51,0);const absTimeRegex=/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$/;const relTimeRegex=/^(\\d+)\\s*(秒前|分钟前|小时前|天前)$/;const likeRegex=/^\\d+$/;const ignoreRegex=/^(?:回复|共\\d+条回复，?)$/;const out=[];let current=null;function pad(n){return n<10?'0'+n:''+n;}function format(ts){const d=new Date(ts);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())+' '+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes());}function pushCurrent(){if(current&&current.time){let content=current.contentLines.join(' ').trim();let result=current.username+'：（'+current.time+'）'+content;if(current.likes!==null&&current.likes!==undefined){result+='（点赞数：'+current.likes+'）';}out.push(result);}current=null;}for(let i=0;i<lines.length;i++){const raw=lines[i];const line=raw.trim();if(line==='')continue;let absMatch=line.match(absTimeRegex);let relMatch=line.match(relTimeRegex);if(absMatch){if(current===null)continue;if(current.time===null){current.time=line;}else{pushCurrent();current={username:line,contentLines:[],time:null,likes:null};}continue;}if(relMatch){if(current===null)continue;const val=parseInt(relMatch[1],10);const unit=relMatch[2];let deltaMs=0;if(unit==='秒前')deltaMs=val*1000;else if(unit==='分钟前')deltaMs=val*60*1000;else if(unit==='小时前')deltaMs=val*60*60*1000;else if(unit==='天前')deltaMs=val*24*60*60*1000;const ts=baseTime-deltaMs;const formatted=format(ts);if(current.time===null){current.time=formatted;}else{pushCurrent();current={username:line,contentLines:[],time:null,likes:null};}continue;}if(likeRegex.test(line)){if(current&&current.time&&current.likes===null)current.likes=line;continue;}if(ignoreRegex.test(line)){pushCurrent();continue;}if(current===null){current={username:line,contentLines:[],time:null,likes:null};}else if(current.time===null){current.contentLines.push(line);}else{pushCurrent();current={username:line,contentLines:[],time:null,likes:null};}}pushCurrent();return out.join('\\n');"
    }
  ],
  "sequences": [
    {
      "name": "清洗视频评论",
      "category": "视频评论清洗",
      "favorite": false,
      "steps": [
        { "actionName": "清洗视频评论为标准格式" }
      ]
    }
  ]
}