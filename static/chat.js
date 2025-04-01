// static/chat.js

const serverIcons = document.querySelectorAll('.server-icon');
const channelList = document.getElementById('channels'); // The UL containing channels
const serverNameDisplay = document.getElementById('server-name');
const createServerButton = document.getElementById('create-server-button');
const serverListDiv = document.querySelector('.server-list');
const contextMenu = document.getElementById('context-menu');
const createChannelOption = document.getElementById('create-channel');
const channelListArea = document.getElementById('channel-list-area'); // The DIV containing the channel list
const messageArea = document.querySelector('.messages'); // Get the message display area
const messageInputField = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

let currentServerId = null; // To store the ID of the currently viewed server
let currentChannelId = null; // To store the ID of the currently selected channel
let contextMenuTimeout;
let currentRightClickedElement = null; // To store the element that was right-clicked

// Function to fetch and display messages
function fetchAndDisplayMessages(channelId) {
    if (channelId) {
        fetch(`/get_messages/${channelId}`)
            .then(response => response.json())
            .then(messages => {
                messageArea.innerHTML = ''; // Clear existing messages
                messages.forEach(msg => {
                    const messageDiv = document.createElement('div');
                    messageDiv.classList.add('message');

                    const profileIconDiv = document.createElement('div');
                    profileIconDiv.classList.add('profile-icon');
                    profileIconDiv.textContent = msg.sender.charAt(0).toUpperCase(); // Get first letter

                    const messageContentDiv = document.createElement('div');
                    messageContentDiv.classList.add('message-content');

                    const usernameDiv = document.createElement('div');
                    usernameDiv.classList.add('username');
                    usernameDiv.textContent = msg.sender;

                    const messageTextDiv = document.createElement('div');
                    messageTextDiv.classList.add('message-text');
                    messageTextDiv.textContent = msg.content;

                    messageContentDiv.appendChild(usernameDiv);
                    messageContentDiv.appendChild(messageTextDiv);

                    messageDiv.appendChild(profileIconDiv);
                    messageDiv.appendChild(messageContentDiv);

                    // Add context menu for messages
                    messageDiv.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        currentRightClickedElement = this; // Store the clicked message

                        clearTimeout(contextMenuTimeout);
                        contextMenu.innerHTML = `
                            <ul>
                                <li>Message Options</li>
                                <li class="delete-option">Delete Message</li>
                            </ul>
                        `;

                        const deleteMessageOption = contextMenu.querySelector('.delete-option');
                        if (deleteMessageOption) {
                            deleteMessageOption.addEventListener('click', handleDeleteMessage);
                        }

                        contextMenu.style.left = e.clientX + 'px';
                        contextMenu.style.top = e.clientY + 'px';
                        contextMenu.style.display = 'block';
                    });

                    messageArea.appendChild(messageDiv);
                });
                messageArea.scrollTop = messageArea.scrollHeight; // Scroll to bottom on new messages
            })
            .catch(error => {
                console.error('Error fetching messages:', error);
            });
    } else {
        messageArea.innerHTML = '';
    }
}

serverIcons.forEach(icon => {
    icon.addEventListener('click', function() {
        const serverId = this.dataset.serverId;
        if (serverId) {
            currentServerId = serverId; // Update the currently viewed server ID
            fetch(`/get_channels/${serverId}`)
                .then(response => response.json())
                .then(data => {
                    serverNameDisplay.textContent = data.server_name;
                    channelList.innerHTML = ''; // Clear existing channels
                    currentChannelId = null; // Reset current channel
                    messageArea.innerHTML = ''; // Clear messages
                    data.channels.forEach(channel => {
                        const li = document.createElement('li');
                        li.textContent = `# ${channel.name}`;
                        li.dataset.channelId = channel.id; // Store channel ID
                        li.addEventListener('click', function() {
                            currentChannelId = this.dataset.channelId;
                            fetchAndDisplayMessages(currentChannelId);
                        });
                        channelList.appendChild(li);
                    });
                })
                .catch(error => {
                    console.error('Error fetching channels:', error);
                });
        }
    });

    icon.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        currentRightClickedElement = this; // Store the clicked server icon

        clearTimeout(contextMenuTimeout);
        contextMenu.innerHTML = `
            <ul>
                <li>Server Options</li>
                <li class="delete-option">Delete Server</li>
            </ul>
        `;

        const deleteServerOption = contextMenu.querySelector('.delete-option');
        if (deleteServerOption) {
            deleteServerOption.addEventListener('click', handleDeleteServer);
        }

        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        contextMenu.style.display = 'block';
    });
});

createServerButton.addEventListener('click', function() {
    const serverName = prompt('Enter the name for your new server:');
    if (serverName) {
        fetch('/create_server', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: serverName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.id && data.name) {
                // Create a new server icon and add it to the list
                const newServerIcon = document.createElement('div');
                newServerIcon.classList.add('server-icon');
                newServerIcon.dataset.serverId = data.id;
                newServerIcon.textContent = data.name[0].toUpperCase();

                newServerIcon.addEventListener('click', function() {
                    const serverId = this.dataset.serverId;
                    if (serverId) {
                        currentServerId = serverId;
                        fetch(`/get_channels/${serverId}`)
                            .then(response => response.json())
                            .then(data => {
                                serverNameDisplay.textContent = data.server_name;
                                channelList.innerHTML = ''; // Clear existing channels
                                currentChannelId = null; // Reset current channel
                                messageArea.innerHTML = ''; // Clear messages
                                data.channels.forEach(channel => {
                                    const li = document.createElement('li');
                                    li.textContent = `# ${channel.name}`;
                                    li.dataset.channelId = channel.id; // Store channel ID
                                    li.addEventListener('click', function() {
                                        currentChannelId = this.dataset.channelId;
                                        fetchAndDisplayMessages(currentChannelId);
                                    });
                                    channelList.appendChild(li);
                                });
                            })
                            .catch(error => {
                                console.error('Error fetching channels:', error);
                            });
                    }
                });

                newServerIcon.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    currentRightClickedElement = this; // Store the clicked server icon

                    clearTimeout(contextMenuTimeout);
                    contextMenu.innerHTML = `
                        <ul>
                            <li>Server Options</li>
                            <li class="delete-option">Delete Server</li>
                        </ul>
                    `;

                    const deleteServerOption = contextMenu.querySelector('.delete-option');
                    if (deleteServerOption) {
                        deleteServerOption.addEventListener('click', handleDeleteServer);
                    }

                    contextMenu.style.left = e.clientX + 'px';
                    contextMenu.style.top = e.clientY + 'px';
                    contextMenu.style.display = 'block';
                });

                // Insert the new icon before the spacer and the create button
                const spacer = document.querySelector('.server-list-bottom-spacer');
                serverListDiv.insertBefore(newServerIcon, spacer);
            } else if (data.error) {
                alert(`Error creating server: ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error creating server:', error);
            alert('Failed to create server. Please try again.');
        });
    }
});

channelListArea.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  const clickedChannel = e.target.closest('li');

  clearTimeout(contextMenuTimeout);
  contextMenu.innerHTML = ''; // Clear previous menu items

  if (currentServerId) {
      if (clickedChannel && clickedChannel.dataset.channelId) {
          // Right-clicked on an existing channel - show delete option
          currentRightClickedElement = clickedChannel;
          contextMenu.innerHTML = `
              <ul>
                  <li class="delete-option">Delete Channel</li>
              </ul>
          `;
          const deleteChannelOption = contextMenu.querySelector('.delete-option');
          if (deleteChannelOption) {
              deleteChannelOption.addEventListener('click', handleDeleteChannel);
          }
      } else {
          // Right-clicked on empty space - show create option
          currentRightClickedElement = channelListArea; // Set context to the container
          contextMenu.innerHTML = `
              <ul>
                  <li>Create Channel</li>
              </ul>
          `;
          const createNewChannelOption = contextMenu.querySelector('li:last-child');
          if (createNewChannelOption) {
              createNewChannelOption.addEventListener('click', function() {
                  contextMenu.style.display = 'none';
                  if (currentServerId) {
                      const channelName = prompt('Enter the name for your new channel:');
                      if (channelName) {
                          fetch(`/create_channel/${currentServerId}`, {
                              method: 'POST',
                              headers: {
                                  'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({ name: channelName })
                          })
                          .then(response => response.json())
                          .then(data => {
                              if (data.id && data.name) {
                                  const newChannelLi = document.createElement('li');
                                  newChannelLi.textContent = `# ${data.name}`;
                                  newChannelLi.dataset.channelId = data.id;
                                  newChannelLi.addEventListener('click', function() {
                                      currentChannelId = this.dataset.channelId;
                                      fetchAndDisplayMessages(currentChannelId);
                                  });
                                  channelList.appendChild(newChannelLi);
                              } else if (data.error) {
                                  alert(`Error creating channel: ${data.error}`);
                              }
                          })
                          .catch(error => {
                              console.error('Error creating channel:', error);
                              alert('Failed to create channel. Please try again.');
                          });
                      }
                  } else {
                      alert('Please select a server first.');
                  }
              });
          }
      }

      contextMenu.style.left = e.clientX + 'px';
      contextMenu.style.top = e.clientY + 'px';
      contextMenu.style.display = 'block';
  }
});

function handleDeleteServer() {
    contextMenu.style.display = 'none';
    if (currentRightClickedElement && currentRightClickedElement.dataset.serverId) {
        const serverIdToDelete = currentRightClickedElement.dataset.serverId;
        const serverNameToDelete = currentRightClickedElement.textContent.trim();
        if (confirm(`Are you sure you want to delete server "${serverNameToDelete}"? All channels and messages will be lost.`)) {
            fetch(`/delete_server/${serverIdToDelete}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentRightClickedElement.remove();
                    serverNameDisplay.textContent = '';
                    channelList.innerHTML = '';
                    messageArea.innerHTML = '';
                    currentServerId = null;
                    currentChannelId = null;
                } else {
                    alert(`Error deleting server: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error deleting server:', error);
                alert('Failed to delete server. Please try again.');
            });
        }
    }
}

function handleDeleteChannel() {
    contextMenu.style.display = 'none';
    if (currentRightClickedElement && currentRightClickedElement.dataset.channelId && currentServerId) {
        const channelIdToDelete = currentRightClickedElement.dataset.channelId;
        const channelNameToDelete = currentRightClickedElement.textContent.trim().substring(1); // Remove '#'
        if (confirm(`Are you sure you want to delete channel "#${channelNameToDelete}"? All messages in this channel will be lost.`)) {
            fetch(`/delete_channel/${currentServerId}/${channelIdToDelete}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentRightClickedElement.remove();
                    messageArea.innerHTML = ''; // Clear messages in the deleted channel
                    currentChannelId = null;
                } else {
                    alert(`Error deleting channel: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error deleting channel:', error);
                alert('Failed to delete channel. Please try again.');
            });
        }
    }
}

function handleDeleteMessage() {
    contextMenu.style.display = 'none';
    if (currentRightClickedElement && currentChannelId) {
        const messageToDelete = currentRightClickedElement;
        const messageContentToDelete = messageToDelete.querySelector('.message-text').textContent.trim();

        if (confirm("Are you sure you want to delete this message?")) {
            fetch(`/delete_message/${currentChannelId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: messageContentToDelete })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    messageToDelete.remove();
                } else {
                    alert(`Error deleting message: ${data.error}`);
                }
            })
            .catch(error => {
                console.error('Error deleting message:', error);
                alert('Failed to delete message. Please try again.');
            });
        }
    }
}

// Close the context menu when clicking anywhere outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('#context-menu')) {
        clearTimeout(contextMenuTimeout);
        contextMenu.style.display = 'none';
        currentRightClickedElement = null;
    }
});

// Update currentChannelId when a channel is clicked (event delegation on the ul)
channelList.addEventListener('click', function(e) {
    const clickedListItem = e.target.closest('li');
    if (clickedListItem) {
        currentChannelId = clickedListItem.dataset.channelId;
        fetchAndDisplayMessages(currentChannelId);
    }
});

sendButton.addEventListener('click', sendMessage);

messageInputField.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const messageContent = messageInputField.value.trim();

    if (messageContent && currentChannelId) {
        fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel_id: currentChannelId,
                content: messageContent
            })
        })
        .then(response => {
            if (response.ok) {
                messageInputField.value = ''; // Clear the input field
                fetchAndDisplayMessages(currentChannelId); // Re-fetch messages to display the new one
            } else {
                console.error('Failed to send message:', response.status);
                alert('Failed to send message.');
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Error sending message.');
        });
    } else if (!currentChannelId) {
        alert('Please select a channel before sending a message.');
    }
}