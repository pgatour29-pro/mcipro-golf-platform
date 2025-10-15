// renderContacts.js (example implementation)
// Make sure your UI actually iterates and prints the fields

const list = document.getElementById('contact-list');
list.innerHTML = ''; // clear old

contacts.forEach((c) => {
  const li = document.createElement('li');
  li.className = 'contact-row';

  const avatarHtml = c.avatar_url 
    ? '<img src="' + c.avatar_url + '" />' 
    : '<span class="placeholder-avatar">' + (c.display_name || '?').slice(0,1) + '</span>';

  const usernameSuffix = c.username ? ' · @' + c.username : '';

  li.innerHTML = 
    '<div class="avatar">' + avatarHtml + '</div>' +
    '<div class="meta">' +
      '<div class="name">' + (c.display_name || '') + '</div>' +
      '<div class="sub">ID: ' + (c.user_code || '') + usernameSuffix + '</div>' +
    '</div>';

  li.onclick = () => openConversationWith(c.id);
  list.appendChild(li);
});

// Show count label plus the actual list
document.getElementById('contact-count').textContent = contacts.length + ' users';
