const crypto = require('crypto');
function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function classify(changes, reason) {
 const r={typed:0, added:0, removed:0, bulk:0, edits:0};
 if(reason) return r; // Undo / redo cannot earn credit.
 for(const c of changes){
  if(c.text.length>32 || c.text.split('\n').length>2){r.bulk+=c.text.length;continue;}
  r.typed+=c.text.length; r.added+=(c.text.match(/\n/g)||[]).length;
  r.removed+=Math.max(0,c.range.end.line-c.range.start.line);r.edits++;
 }
 return r;
}
function eligible(file, excludes){return !file.split(/[\\/]/).some(x=>excludes.includes(x)) && !/\.(min\.js|map|lock|svg|csv|jsonl)$/i.test(file);}
function id(s){return crypto.createHash('sha256').update(s).digest('hex').slice(0,16);}
function eligibleDocument(doc,excludes=[]){return !!doc&&((doc.uri.scheme==='untitled')||(doc.uri.scheme==='file'&&eligible(doc.uri.fsPath,excludes)));}
function trackedLanguage(doc){
 const language=doc.languageId||'plaintext';if(language!=='plaintext'||typeof doc.getText!=='function')return language;
 // Inspect a short sample in memory only. Do not save document contents.
 const sample=(doc.getText().slice(0,4096));
 return /<!doctype\s+html\b|<(?:html|head|body|div|p|h[1-6]|section|article|main|form|input|button|ul|li|table|a|span)(?:\s[^<>]*|)\/?\s*>/i.test(sample)?'html':language;
}
module.exports={dayKey,classify,eligible,id,eligibleDocument,trackedLanguage};
