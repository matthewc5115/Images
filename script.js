const STORAGE_KEY_PREFIX = 'images_user_';
const SESSION_USER_KEY = 'github_sim_user';

const signinButton = document.getElementById('github-signin');
const signoutButton = document.getElementById('signout');
const usernameDisplay = document.getElementById('username-display');
const signedInArea = document.getElementById('signed-in');
const fileInput = document.getElementById('file-upload');
const statusEl = document.getElementById('status');
const gallery = document.getElementById('gallery');
const noImages = document.getElementById('no-images');

function getCurrentUser() {
  return localStorage.getItem(SESSION_USER_KEY);
}

function setCurrentUser(username) {
  if (username) {
    localStorage.setItem(SESSION_USER_KEY, username);
  } else {
    localStorage.removeItem(SESSION_USER_KEY);
  }
  renderAuth();
  loadImages();
}

function getStorageKeyForUser(username) {
  return STORAGE_KEY_PREFIX + username;
}

function saveImagesForUser(username, images) {
  localStorage.setItem(getStorageKeyForUser(username), JSON.stringify(images));
}

function loadImagesForUser(username) {
  const raw = localStorage.getItem(getStorageKeyForUser(username));
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Invalid stored images array', err);
    return [];
  }
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
  if (message) {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.classList.remove('error');
    }, 3000);
  }
}

function renderAuth() {
  const username = getCurrentUser();
  if (username) {
    signinButton.classList.add('hidden');
    signedInArea.classList.remove('hidden');
    usernameDisplay.textContent = `Signed in as ${username}`;
    fileInput.disabled = false;
  } else {
    signinButton.classList.remove('hidden');
    signedInArea.classList.add('hidden');
    usernameDisplay.textContent = '';
    fileInput.disabled = true;
  }
}

function renderGallery(images) {
  gallery.innerHTML = '';
  if (!images || images.length === 0) {
    noImages.classList.remove('hidden');
    return;
  }

  noImages.classList.add('hidden');
  images.forEach((image) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = image.dataUrl;
    img.alt = image.name;

    const caption = document.createElement('div');
    caption.className = 'caption';
    caption.textContent = image.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      const currentUser = getCurrentUser();
      const existing = loadImagesForUser(currentUser);
      const filtered = existing.filter((x) => x.id !== image.id);
      saveImagesForUser(currentUser, filtered);
      renderGallery(filtered);
      setStatus('Image removed.');
    });

    item.appendChild(img);
    item.appendChild(caption);
    item.appendChild(removeBtn);
    gallery.appendChild(item);
  });
}

function loadImages() {
  const user = getCurrentUser();
  if (!user) {
    renderGallery([]);
    return;
  }
  const images = loadImagesForUser(user);
  renderGallery(images);
}

signinButton.addEventListener('click', () => {
  const username = prompt('Enter your GitHub username (simulated sign-in):');
  if (!username || !username.trim()) {
    setStatus('GitHub sign-in cancelled.', true);
    return;
  }
  setCurrentUser(username.trim());
  setStatus(`Signed in as ${username.trim()}`);
});

signoutButton.addEventListener('click', () => {
  setCurrentUser(null);
  setStatus('Signed out.');
});

fileInput.addEventListener('change', async (event) => {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const username = getCurrentUser();
  if (!username) {
    setStatus('Please sign in first.', true);
    fileInput.value = '';
    return;
  }

  const existingImages = loadImagesForUser(username);
  const finalImages = [...existingImages];

  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });

    finalImages.unshift({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl,
      uploadedAt: new Date().toISOString(),
    });
  }

  saveImagesForUser(username, finalImages);
  renderGallery(finalImages);
  setStatus(`${files.length} image(s) uploaded and saved.`);
  fileInput.value = '';
});

// Initialize
renderAuth();
loadImages();

// Optionally support direct URL token-based signin for real OAuth callback handling.
// Example: ?github_user=<username>
const params = new URLSearchParams(location.search);
if (params.get('github_user')) {
  setCurrentUser(params.get('github_user'));
  params.delete('github_user');
  const newUrl = `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  history.replaceState({}, '', newUrl);
}
