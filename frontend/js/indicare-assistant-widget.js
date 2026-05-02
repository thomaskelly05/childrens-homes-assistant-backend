(function(){
  window.IndiCareAssistant = {
    init: function(config){
      const btn = document.createElement('button');
      btn.innerText = 'Ask IndiCare';
      btn.style.position = 'fixed';
      btn.style.bottom = '20px';
      btn.style.right = '20px';
      btn.style.zIndex = '9999';

      btn.onclick = async function(){
        const message = prompt('Ask IndiCare');
        if(!message) return;

        const res = await fetch(config.apiUrl + '/v1/assistant/respond', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey
          },
          body: JSON.stringify({ message })
        });

        const data = await res.json();
        alert(data.answer);
      };

      document.body.appendChild(btn);
    }
  };
})();
