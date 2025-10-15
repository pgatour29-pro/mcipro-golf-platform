// renderContacts.ts (example implementation)
// Make sure your UI actually iterates and prints the fields

const list = document.getElementById('contact-list');
list.innerHTML = ''; // clear old

contacts.forEach((c) => {
  const li = document.createElement('li');
  li.className = 'contact-row';

  li.innerHTML = `
    <div class="avatar">${c.avatar_url ? `<img src="${c.avatar_url}" />` : `<span class="placeholder-avatar">${(c.display_name || '?').slice(0,1)}</span>`}</div>
    <div class="meta">
      <div class="name">${c.display_name ?? ''}</div>
      <div class="sub">ID: ${c.user_code ?? ''}${c.username ? ' · @' + c.username : ''}</div>
    </div>
  `;

  li.onclick = () => openConversationWith(c.id);
  list.appendChild(li);
});

// Show count label *plus* the actual list (don't show only a count)
document.getElementById('contact-count').textContent = `${contacts.length} users`;
