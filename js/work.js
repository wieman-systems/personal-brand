/* Progressive enhancement: all projects remain readable as native disclosures. */
(() => {
  'use strict';
  const projects = Array.from(document.querySelectorAll('.project'));
  const controls = document.querySelector('.collection-controls');
  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const search = document.getElementById('project-search');
  const status = document.getElementById('filter-status');
  const empty = document.querySelector('.no-results');
  const dialog = document.getElementById('case-dialog');
  const content = document.getElementById('case-content');
  const copyStatus = document.getElementById('copy-status');
  let category = 'all';
  let active = null;
  let opener = null;
  let returnHash = '';
  let copyTimer;

  function filterProjects() {
    const query = search.value.trim().toLocaleLowerCase();
    let count = 0;
    projects.forEach(project => {
      const visible = (category === 'all' || project.dataset.category === category) && (!query || project.dataset.search.includes(query));
      project.hidden = !visible;
      if (visible) count++;
    });
    status.textContent = `${String(count).padStart(2, '0')} ${count === 1 ? 'PROJECT' : 'PROJECTS'} / SELECT A PROJECT TO EXPLORE`;
    empty.hidden = count !== 0;
    filters.forEach(button => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  if (controls) controls.hidden = false;
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; filterProjects(); }));
  search.addEventListener('input', filterProjects);
  document.getElementById('reset-filters').addEventListener('click', () => { category='all'; search.value=''; filterProjects(); search.focus(); });

  if (typeof dialog.showModal !== 'function') return;

  function setHash(hash) {
    history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  }
  function openProject(project, trigger, updateHash = true) {
    if (!project) return;
    if (!dialog.open) { opener = trigger || project.querySelector('summary'); returnHash = projects.some(p => `#${p.id}` === location.hash) ? '' : location.hash; }
    active = project;
    content.replaceChildren(project.querySelector('.case-inner').cloneNode(true));
    content.querySelector('.case-title').id = 'case-dialog-title';
    copyStatus.textContent='';
    clearTimeout(copyTimer);
    const visible = projects.filter(p => !p.hidden);
    const list = visible.includes(project) ? visible : projects;
    document.getElementById('case-position').textContent = `${String(list.indexOf(project)+1).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;
    if (!dialog.open) { dialog.showModal(); document.body.classList.add('case-open'); }
    dialog.scrollTop=0;
    document.getElementById('close-project').focus({preventScroll:true});
    if (updateHash) setHash(`#${project.id}`);
  }
  function closeProject() { if (dialog.open) dialog.close(); }
  projects.forEach(project => project.querySelector('summary').addEventListener('click', event => { event.preventDefault(); openProject(project,event.currentTarget); }));
  document.querySelectorAll('[data-project]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); openProject(projects.find(p => p.id===link.dataset.project),link); }));
  document.getElementById('close-project').addEventListener('click',closeProject);
  dialog.addEventListener('click',event=>{ if(event.target===dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeProject(); } });
  dialog.addEventListener('close',()=>{ document.body.classList.remove('case-open'); if (active && location.hash===`#${active.id}`) setHash(returnHash); if(opener && !opener.closest('[hidden]')) opener.focus({preventScroll:true}); active=null; });
  function step(direction) {
    if (!active) return;
    const visible = projects.filter(p=>!p.hidden);
    const list = visible.includes(active) ? visible : projects;
    const index = list.indexOf(active);
    openProject(list[(index+direction+list.length)%list.length],null);
  }
  document.getElementById('previous-project').addEventListener('click',()=>step(-1));
  document.getElementById('next-project').addEventListener('click',()=>step(1));
  document.getElementById('copy-project').addEventListener('click',async()=>{
    if(!active) return;
    const url=new URL(location.href); url.hash=active.id;
    try { await navigator.clipboard.writeText(url.href); copyStatus.textContent='Project link copied.'; }
    catch { copyStatus.textContent=`Project link: ${url.href}`; }
    clearTimeout(copyTimer); copyTimer=setTimeout(()=>{copyStatus.textContent='';},6000);
  });
  function readHash() {
    const project=projects.find(p=>`#${p.id}`===location.hash);
    if(project) openProject(project,null,false);
    else if(dialog.open) closeProject();
  }
  window.addEventListener('hashchange',readHash);
  readHash();
})();
