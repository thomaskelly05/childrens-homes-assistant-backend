(function(){
  function mount(){
    var root=document.getElementById('indicareAiRoot');
    if(!root) return;
    root.innerHTML='\n      <div class="ic-loading">\n        <div class="ic-orb"></div>\n        <h1>IndiCare AI</h1>\n        <p>Isolated intelligence runtime initialising...</p>\n      </div>\n    ';
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',mount);
  }else{
    mount();
  }
})();
