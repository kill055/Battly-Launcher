
let socket = null;
let isAuthenticated = false;
let messageQueue = [];
let chatUsername = '';
let userColor = '#3498db';
let userBadge = null;
const SOCKET_URL = 'https://chat.hytalef2p.com';
const MAX_MESSAGE_LENGTH = 500;

async function getOrCreatePlayerId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function initChat() {
  if (window.electronAPI?.loadChatUsername) {
    chatUsername = await window.electronAPI.loadChatUsername();
  }
  
  if (window.electronAPI?.loadChatColor) {
    const savedColor = await window.electronAPI.loadChatColor();
    if (savedColor) {
      userColor = savedColor;
    }
  }

  if (!chatUsername || chatUsername.trim() === '') {
    showUsernameModal();
    return;
  }

  setupChatUI();
  setupColorSelector();
  await connectToChat();
}

function showUsernameModal() {
  const modal = document.getElementById('chatUsernameModal');
  if (modal) {
    modal.style.display = 'flex';
    
    const input = document.getElementById('chatUsernameInput');
    if (input) {
      setTimeout(() => input.focus(), 100);
    }
  }
}

function hideUsernameModal() {
  const modal = document.getElementById('chatUsernameModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function submitChatUsername() {
  const input = document.getElementById('chatUsernameInput');
  const errorMsg = document.getElementById('chatUsernameError');
  
  if (!input) return;

  const username = input.value.trim();

  if (username.length === 0) {
    if (errorMsg) errorMsg.textContent = 'Username cannot be empty';
    return;
  }

  if (username.length < 3) {
    if (errorMsg) errorMsg.textContent = 'Username must be at least 3 characters';
    return;
  }

  if (username.length > 20) {
    if (errorMsg) errorMsg.textContent = 'Username must be 20 characters or less';
    return;
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    if (errorMsg) errorMsg.textContent = 'Username can only contain letters, numbers, - and _';
    return;
  }

  chatUsername = username;
  if (window.electronAPI?.saveChatUsername) {
    await window.electronAPI.saveChatUsername(username);
  }

  hideUsernameModal();

  setupChatUI();
  await connectToChat();
}

function setupChatUI() {
  const sendBtn = document.getElementById('chatSendBtn');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  if (!sendBtn || !chatInput || !chatMessages) {
    console.warn('Chat UI elements not found');
    return;
  }

  sendBtn.addEventListener('click', () => {
    sendMessage();
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  chatInput.addEventListener('input', () => {
    if (chatInput.value.length > MAX_MESSAGE_LENGTH) {
      chatInput.value = chatInput.value.substring(0, MAX_MESSAGE_LENGTH);
    }
    updateCharCounter();
  });

  updateCharCounter();
}

async function connectToChat() {
  try {
    if (!window.io) {
      await loadSocketIO();
    }

    const userId = await window.electronAPI?.getUserId();

    if (!userId) {
      console.error('User ID not available');
      addSystemMessage('Error: Could not connect to chat');
      return;
    }

    if (!chatUsername || chatUsername.trim() === '') {
      console.error('Chat username not set');
      addSystemMessage('Error: Username not set');
      return;
    }

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', async () => {
      console.log('Connected to chat server');
      
      const uuid = await window.electronAPI?.getCurrentUuid();
      
      socket.emit('authenticate', { 
        username: chatUsername, 
        userId,
        uuid: uuid,
        userColor: userColor
      });
    });

    socket.on('authenticated', (data) => {
      isAuthenticated = true;
      userBadge = data.badge; 
      addSystemMessage(`Connected as ${data.username}`);
      
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        socket.emit('send_message', { message: msg });
      }
    });

    socket.on('message', (data) => {
      if (data.type === 'system') {
        addSystemMessage(data.message);
      } else if (data.type === 'user') {
        addUserMessage(data.username, data.message, data.timestamp, data.userColor, data.badge);
      }
    });

    socket.on('users_update', (data) => {
      updateOnlineCount(data.count);
    });

    socket.on('error', (data) => {
      addSystemMessage(`Error: ${data.message}`, 'error');
    });

    socket.on('clear_chat', (data) => {
      clearAllMessages();
      addSystemMessage(data.message || 'Chat cleared by server', 'warning');
    });

    socket.on('disconnect', () => {
      isAuthenticated = false;
      console.log('Disconnected from chat server');
      addSystemMessage('Disconnected from chat', 'error');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      addSystemMessage('Connection error. Retrying...', 'error');
    });

  } catch (error) {
    console.error('Error connecting to chat:', error);
    addSystemMessage('Failed to connect to chat server', 'error');
  }
}

function loadSocketIO() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const message = chatInput.value.trim();

  if (!message || message.length === 0) {
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    addSystemMessage(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`, 'error');
    return;
  }

  if (!socket || !isAuthenticated) {
    messageQueue.push(message);
    addSystemMessage('Connecting... Your message will be sent soon.', 'warning');
    chatInput.value = '';
    updateCharCounter();
    return;
  }

  socket.emit('send_message', { message });
  
  chatInput.value = '';
  updateCharCounter();
}

function addUserMessage(username, message, timestamp, userColor = '#3498db', badge = null) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message user-message';

  const time = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  let badgeHTML = '';
  if (badge) {
    let badgeStyle = '';
    if (badge.style === 'rainbow') {
      badgeStyle = `background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7, #fab1a0, #fd79a8); background-size: 400% 400%; animation: rainbow 3s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: bold; display: inline;`;
    } else if (badge.style === 'gradient') {
      if (badge.badge === 'CONTRIBUTOR') {
        badgeStyle = `background: linear-gradient(45deg, #22c55e, #16a34a); background-size: 200% 200%; animation: contributorGlow 2s ease infinite; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: bold; display: inline;`;
      } else {
        badgeStyle = `color: ${badge.color}; font-weight: bold; display: inline;`;
      }
    }
    
    badgeHTML = `<span class="user-badge" style="${badgeStyle}">[${badge.badge}]</span> `;
  }

  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="message-user-info">${badgeHTML}<span class="message-username" style="font-weight: bold;" data-username-color="${userColor}">${escapeHtml(username)}</span></span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-content">${message}</div>
  `;

  const usernameElement = messageDiv.querySelector('.message-username');
  if (usernameElement) {
    applyUserColorStyle(usernameElement, userColor);
  }

  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function addSystemMessage(message, type = 'info') {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message system-message system-${type}`;
  messageDiv.innerHTML = `
    <div class="message-content">
      <i class="fas fa-info-circle"></i> ${escapeHtml(message)}
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

function updateOnlineCount(count) {
  const onlineCountElement = document.getElementById('chatOnlineCount');
  if (onlineCountElement) {
    onlineCountElement.textContent = count;
  }
}

function updateCharCounter() {
  const chatInput = document.getElementById('chatInput');
  const charCounter = document.getElementById('chatCharCounter');
  
  if (chatInput && charCounter) {
    const length = chatInput.value.length;
    charCounter.textContent = `${length}/${MAX_MESSAGE_LENGTH}`;
    
    if (length > MAX_MESSAGE_LENGTH * 0.9) {
      charCounter.classList.add('warning');
    } else {
      charCounter.classList.remove('warning');
    }
  }
}

function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

function clearAllMessages() {
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = '';
    console.log('Chat cleared');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const usernameSubmitBtn = document.getElementById('chatUsernameSubmit');
  const usernameCancelBtn = document.getElementById('chatUsernameCancel');
  const usernameInput = document.getElementById('chatUsernameInput');

  if (usernameSubmitBtn) {
    usernameSubmitBtn.addEventListener('click', submitChatUsername);
  }

  if (usernameCancelBtn) {
    usernameCancelBtn.addEventListener('click', () => {
      hideUsernameModal();
      const playNavItem = document.querySelector('[data-page="play"]');
      if (playNavItem) playNavItem.click();
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitChatUsername();
      }
    });
  }

  const chatNavItem = document.querySelector('[data-page="chat"]');
  if (chatNavItem) {
    chatNavItem.addEventListener('click', () => {
      if (!socket) {
        initChat();
      }
    });
  }
});

function setupColorSelector() {
  const colorBtn = document.getElementById('chatColorBtn');
  if (colorBtn) {
    colorBtn.addEventListener('click', showChatColorModal);
  }

  const colorOptions = document.querySelectorAll('.color-option');
  colorOptions.forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      updateColorPreview();
    });
  });

  const customColor = document.getElementById('customColor');
  if (customColor) {
    customColor.addEventListener('input', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      updateColorPreview();
    });
  }
}

function showChatColorModal() {
  const modal = document.getElementById('chatColorModal');
  if (modal) {
    modal.style.display = 'flex';
    updateColorPreview();
  }
}

window.closeChatColorModal = function() {
  const modal = document.getElementById('chatColorModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function updateColorPreview() {
  const preview = document.getElementById('colorPreview');
  if (!preview) return;
  
  const selectedOption = document.querySelector('.color-option.selected');
  let color = '#3498db';
  
  if (selectedOption) {
    color = selectedOption.dataset.color;
  } else {
    const customColor = document.getElementById('customColor');
    if (customColor) color = customColor.value;
  }
  
  preview.style.color = color;
  preview.style.background = 'transparent';
  preview.style.webkitBackgroundClip = 'initial';
  preview.style.webkitTextFillColor = 'initial';
}

window.applyChatColor = async function() {
  let newColor;
  
  const selectedOption = document.querySelector('.color-option.selected');
  if (selectedOption) {
    newColor = selectedOption.dataset.color;
  } else {
    const customColor = document.getElementById('customColor');
    newColor = customColor ? customColor.value : '#3498db';
  }

  userColor = newColor;

  if (window.electronAPI?.saveChatColor) {
    await window.electronAPI.saveChatColor(newColor);
  }

  if (socket && isAuthenticated) {
    const uuid = await window.electronAPI?.getCurrentUuid();
    socket.emit('authenticate', { 
      username: chatUsername, 
      userId: await getOrCreatePlayerId(),
      uuid: uuid,
      userColor: userColor
    });
    
    addSystemMessage('Username color updated successfully', 'success');
  }

  closeChatColorModal();
}

function applyUserColorStyle(element, color) {
  element.style.color = color;
  element.style.background = 'transparent';
  element.style.webkitBackgroundClip = 'initial';
  element.style.webkitTextFillColor = 'initial';
}

window.ChatAPI = {
  send: sendMessage,
  disconnect: () => socket?.disconnect()
};
