(function(){
  const toggle = document.getElementById('themeToggle');
  function applyTheme(t){
    document.body.setAttribute('data-theme', t);
    if(toggle) toggle.textContent = t === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('lit-theme', t);
  }
  const saved = localStorage.getItem('lit-theme');
  if(saved){ applyTheme(saved); }
  else{
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  if(toggle){
    toggle.addEventListener('click', ()=>{
      const cur = document.body.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }
  
})();