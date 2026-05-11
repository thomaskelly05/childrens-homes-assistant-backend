(function(){
  if(window.__IndiCareNotesBeamInstalled) return;
  window.__IndiCareNotesBeamInstalled=true;

  var noteText=localStorage.getItem('ic.ai.notes')||'';
  var recording=false;
  var startedAt=0;
  var timer=null;

  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function mode(){return localStorage.getItem('ic.ai.mode')||'';}
  function fmt(sec){var m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
  function elapsed(){return recording?fmt(Math.floor((Date.now()-startedAt)/1000)):'00:00';}
  function root(){return document.querySelector('.notes-shell');}

  function sampleNote(){
    return noteText || 'James Johnson met with Beth, a social worker, to discuss his health and care needs. James expressed a strong desire to remain at home, and concerns were raised about his recent decline in health, frequent falls, and the impact on daily living activities.\n\nThe social worker explored care package options to address nutrition, hygiene and safety. The importance of ongoing monitoring and family involvement in decision-making was highlighted.';
  }

  function build(){
    var text=sampleNote();
    return '<section class="beam-notes-shell">'+
      '<aside class="beam-nav"><div class="beam-logo"><strong>IndiCare</strong><span>Notes</span></div><button>⌂ Home</button><button data-beam-record>◉ Record</button><button class="active">✎ Notes</button><button>▤ Reports</button><button>▣ Cases</button><button>▦ Templates</button><div class="beam-nav-bottom"><button>?</button><button>⚙ Settings</button></div></aside>'+
      '<main class="beam-document"><header><div><h1>James Johnson Care Assessment <button data-beam-edit-title>✎</button></h1><small>15 May 2025 at 9:31am</small></div><button data-beam-more>•••</button></header>'+
      '<div class="beam-tabs"><button class="active">☷ Summary</button><button data-beam-record>▥ Recording & transcript</button></div>'+
      '<div class="beam-cards"><button class="active"><strong>General</strong><span>A summary of the meeting</span></button><button><strong>Care Assessment</strong><span>Organised by Care Act Assessment section</span></button><button><strong>Supervision</strong><span>Organised by case</span></button><button><strong>Care Review</strong><span>Organised by Care Review from section</span></button></div>'+
      '<article class="beam-note-body"><h2>Overview</h2><p>'+esc(text).replace(/\n\n/g,'</p><p>')+'</p><h2>Managing and Maintaining Nutrition</h2><p>James experiences challenges in managing his nutrition. Relevant risks, supports and follow-up actions should be recorded clearly and reviewed with the appropriate professional oversight.</p><h2>Maintaining Personal Hygiene</h2><p>James can move between rooms but may need support with confidence, stability and personal care arrangements.</p><h2>Maintaining a Habitable Home Environment</h2><p>Relevant observations, family support and environmental risks should be recorded factually.</p></article>'+
      '<footer class="beam-meta"><div><strong>Recorded</strong><span>15 May 2025, 9:31am</span></div><div><strong>Duration</strong><span>32:14</span></div><div><strong>Participants</strong><span>JJ · Beth · +1</span></div><div><strong>Case</strong><span>James Johnson ↗</span></div></footer>'+
      '</main>'+
      '<aside class="beam-ai"><header><h2>Edit with AI</h2><button data-beam-close>×</button></header><button data-beam-transform="Change writing style"><strong>Change writing style</strong><span>Make it more professional</span></button><button data-beam-transform="Fix spelling and grammar"><strong>Fix spelling & grammar</strong><span>Check and correct errors</span></button><button data-beam-transform="Rewrite as"><strong>Rewrite as...</strong><span>Adjust tone and phrasing</span></button><textarea id="beamChange" placeholder="Describe a change...\n\nE.g. shorten this summary, focus on nutrition, make it more formal..."></textarea></aside>'+
      '<div class="beam-recorder '+(recording?'recording':'')+'"><button data-beam-cancel>× Cancel recording</button><div class="beam-file">▱</div><div class="beam-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><strong>'+(recording?'Recording...':'Ready to record')+'</strong><span>'+elapsed()+'</span><div class="beam-recorder-actions"><button data-beam-pause>Ⅱ</button><button data-beam-save>Save recording</button></div></div>'+
      '</section>';
  }

  function render(){
    var host=root();
    if(!host||host.dataset.beamMounted==='1') return;
    host.dataset.beamMounted='1';
    host.outerHTML=build();
  }

  function sendPrompt(prompt){
    var textarea=document.getElementById('prompt');
    if(textarea){textarea.value=prompt;}
    var send=document.querySelector('[data-action="send"]');
    if(send) send.click();
  }

  function toggleRecord(){
    recording=!recording;
    if(recording){startedAt=Date.now();}
    clearInterval(timer);
    if(recording) timer=setInterval(function(){var r=document.querySelector('.beam-recorder span');if(r)r.textContent=elapsed();},1000);
    var shell=document.querySelector('.beam-notes-shell');
    if(shell) shell.outerHTML=build();
  }

  document.addEventListener('click',function(e){
    var rec=e.target.closest('[data-beam-record]');
    if(rec){toggleRecord();return;}
    var cancel=e.target.closest('[data-beam-cancel]');
    if(cancel){recording=false;clearInterval(timer);var shell=document.querySelector('.beam-notes-shell');if(shell)shell.outerHTML=build();return;}
    var save=e.target.closest('[data-beam-save]');
    if(save){recording=false;clearInterval(timer);sendPrompt('Turn this recording transcript into a professional care assessment note with summary, care assessment, supervision points and actions.');return;}
    var transform=e.target.closest('[data-beam-transform]');
    if(transform){var change=document.getElementById('beamChange');sendPrompt(transform.dataset.beamTransform+': '+(change&&change.value?change.value:'Improve the current note professionally')+'\n\nCurrent note:\n'+sampleNote());return;}
  });

  document.addEventListener('input',function(e){
    if(e.target&&e.target.id==='beamChange') localStorage.setItem('ic.ai.notes.change',e.target.value);
  });

  var observer=new MutationObserver(function(){if(mode()==='notes')setTimeout(render,30);});
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){if(mode()==='notes')render();});else if(mode()==='notes')render();
})();
