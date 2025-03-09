document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const shareMicBtn = document.getElementById('share-mic');
    const shareTabBtn = document.getElementById('share-tab');
    const tabSelectorDiv = document.getElementById('tab-selector');
    const tabListDiv = document.getElementById('tab-list');
    const refreshTabsBtn = document.getElementById('refresh-tabs');
    const roomCreatedDiv = document.getElementById('room-created');
    const roomLinkInput = document.getElementById('room-link');
    const copyLinkBtn = document.getElementById('copy-link');
    const qrcodeDiv = document.getElementById('qrcode');
    const muteToggleBtn = document.getElementById('mute-toggle');
    const endSessionBtn = document.getElementById('end-session');
    const joinLinkInput = document.getElementById('join-link');
    const joinBtn = document.getElementById('join-btn');
    const listeningDiv = document.getElementById('listening');
    const volumeSlider = document.getElementById('volume-slider');
    const leaveSessionBtn = document.getElementById('leave-session');
    const audioVisualizer = document.getElementById('audio-visualizer');
    const userListDiv = document.getElementById('user-list');
    
    // Account elements
    const accountBtn = document.getElementById('account-btn');
    const accountStatus = document.getElementById('account-status');
    const accountModal = document.getElementById('account-modal');
    const closeModal = document.querySelector('.close-modal');
    const loginSection = document.getElementById('login-section');
    const profileSection = document.getElementById('profile-section');
    const usernameInput = document.getElementById('username');
    const displayNameInput = document.getElementById('display-name');
    const colorOptions = document.querySelectorAll('.color-option');
    const saveAccountBtn = document.getElementById('save-account');
    const logoutBtn = document.getElementById('logout-btn');
    const profileUsername = document.getElementById('profile-username');
    const profileDisplayName = document.getElementById('profile-display-name');
    const profileAvatar = document.getElementById('profile-avatar');
    
    // Lobby elements
    const activeSessionsDiv = document.getElementById('active-sessions');
    const refreshLobbyBtn = document.getElementById('refresh-lobby');
    const searchSessionsInput = document.getElementById('search-sessions');

    // Global variables
    let peer;
    let myStream;
    let connections = [];
    let audioContext;
    let analyser;
    let remoteAudio;
    let isMuted = false;
    let visualizerAnimationId;
    let availableTabs = [];
    let selectedTabId = null;
    let currentUser = null;
    let activeSessions = [];
    let selectedColor = '#4a6bff';
    let connectedUsers = [];
    let currentRoomId = null;

    // Initialize app
    function init() {
        // Load user from local storage
        loadUserFromStorage();
        
        // Check URL for room parameter
        checkUrlForRoom();
        
        // Load ads
        loadAds();
    }

    // Account Management Functions
    function loadUserFromStorage() {
        const savedUser = localStorage.getItem('audioShareUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            updateUIForLoggedInUser();
        }
    }

    function saveUserToStorage(user) {
        localStorage.setItem('audioShareUser', JSON.stringify(user));
        currentUser = user;
    }

    function updateUIForLoggedInUser() {
        // Update account button
        accountStatus.textContent = currentUser.displayName || currentUser.username;
        
        // Update profile section
        profileUsername.textContent = currentUser.username;
        profileDisplayName.textContent = currentUser.displayName;
        profileAvatar.style.backgroundColor = currentUser.avatarColor;
        profileAvatar.textContent = getInitials(currentUser.displayName || currentUser.username);
        
        // Show profile section, hide login section
        loginSection.classList.add('hidden');
        profileSection.classList.remove('hidden');
    }

    function updateUIForLoggedOutUser() {
        // Update account button
        accountStatus.textContent = 'Sign In';
        
        // Show login section, hide profile section
        loginSection.classList.remove('hidden');
        profileSection.classList.add('hidden');
        
        // Clear form fields
        usernameInput.value = '';
        displayNameInput.value = '';
        
        // Reset color selection
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        colorOptions[0].classList.add('selected');
        selectedColor = colorOptions[0].dataset.color;
    }

    function getInitials(name) {
        return name.split(' ').map(part => part.charAt(0)).join('').toUpperCase();
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('audioShareUser');
        updateUIForLoggedOutUser();
        closeAccountModal();
    }

    function openAccountModal() {
        accountModal.classList.remove('hidden');
    }

    function closeAccountModal() {
        accountModal.classList.add('hidden');
    }

    // Initialize PeerJS
    function initPeer() {
        // Generate a random ID for this peer
        const peerId = generateRandomId();
        
        peer = new Peer(peerId, {
            debug: 2
        });

        peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            alert(`Connection error: ${err.message}`);
        });

        // Handle incoming connections
        peer.on('connection', (conn) => {
            handleConnection(conn);
        });

        // Handle incoming calls
        peer.on('call', (call) => {
            call.answer(); // Answer the call without sending a stream back
            
            call.on('stream', (remoteStream) => {
                // Display the remote stream
                playRemoteStream(remoteStream);
            });
        });

        return peerId;
    }

    // Generate a random ID
    function generateRandomId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Handle new connection
    function handleConnection(conn) {
        connections.push(conn);
        
        conn.on('open', () => {
            console.log('Connection established with peer: ' + conn.peer);
            
            // Add user to connected users if metadata exists
            if (conn.metadata) {
                addConnectedUser(conn.metadata, conn.peer);
            }
        });
        
        conn.on('data', (data) => {
            console.log('Received data:', data);
            
            if (data.type === 'user-joined') {
                addConnectedUser(data.user, conn.peer);
            }
        });
        
        conn.on('close', () => {
            console.log('Connection closed with peer: ' + conn.peer);
            removeConnectedUser(conn.peer);
            connections = connections.filter(c => c.peer !== conn.peer);
        });
        
        // If we have a stream, call the peer
        if (myStream) {
            callPeer(conn.peer, myStream);
        }
        
        // Send current user list to the new connection
        conn.send({
            type: 'user-list',
            users: connectedUsers
        });
    }

    // Share microphone audio
    async function shareMicrophone() {
        // Check if user is logged in
        if (!currentUser) {
            alert('Please sign in to share audio.');
            openAccountModal();
            return;
        }
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            startSharing(stream);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    // Show tab selector
    function showTabSelector() {
        // Check if user is logged in
        if (!currentUser) {
            alert('Please sign in to share audio.');
            openAccountModal();
            return;
        }
        
        tabSelectorDiv.classList.remove('hidden');
        loadAvailableTabs();
    }

    // Load available tabs
    async function loadAvailableTabs() {
        tabListDiv.innerHTML = '<div class="loading">Loading available tabs...</div>';
        
        try {
            // This is a mock implementation since the actual API to get tabs
            // requires a Chrome extension with specific permissions
            // In a real implementation, this would use chrome.tabs.query or similar
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock data for available tabs
            availableTabs = [
                { id: 'tab1', title: 'YouTube - Music', url: 'https://youtube.com', favIconUrl: 'https://www.youtube.com/favicon.ico' },
                { id: 'tab2', title: 'Spotify - Web Player', url: 'https://open.spotify.com', favIconUrl: 'https://open.spotify.com/favicon.ico' },
                { id: 'tab3', title: 'Netflix', url: 'https://netflix.com', favIconUrl: 'https://netflix.com/favicon.ico' },
                { id: 'tab4', title: 'SoundCloud - Listen to music', url: 'https://soundcloud.com', favIconUrl: 'https://soundcloud.com/favicon.ico' },
                { id: 'tab5', title: 'Google Meet', url: 'https://meet.google.com', favIconUrl: 'https://meet.google.com/favicon.ico' },
                { id: 'tab6', title: 'Zoom Meeting', url: 'https://zoom.us', favIconUrl: 'https://zoom.us/favicon.ico' }
            ];
            
            renderTabList();
        } catch (err) {
            console.error('Error loading tabs:', err);
            tabListDiv.innerHTML = '<div class="error">Error loading tabs. Please try again.</div>';
        }
    }

    // Render tab list
    function renderTabList() {
        if (availableTabs.length === 0) {
            tabListDiv.innerHTML = '<div class="no-tabs">No tabs with audio found. Please open a tab with audio content.</div>';
            return;
        }
        
        tabListDiv.innerHTML = '';
        
        availableTabs.forEach(tab => {
            const tabItem = document.createElement('div');
            tabItem.className = `tab-item ${tab.id === selectedTabId ? 'selected' : ''}`;
            tabItem.dataset.tabId = tab.id;
            
            const tabIcon = document.createElement('img');
            tabIcon.className = 'tab-icon';
            tabIcon.src = tab.favIconUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="%23757575" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>';
            tabIcon.alt = '';
            
            const tabTitle = document.createElement('div');
            tabTitle.className = 'tab-title';
            tabTitle.textContent = tab.title;
            
            tabItem.appendChild(tabIcon);
            tabItem.appendChild(tabTitle);
            
            tabItem.addEventListener('click', () => {
                selectTab(tab.id);
            });
            
            tabListDiv.appendChild(tabItem);
        });
    }

    // Select a tab
    function selectTab(tabId) {
        selectedTabId = tabId;
        
        // Update UI to show selected tab
        document.querySelectorAll('.tab-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.tabId === tabId);
        });
        
        // Enable sharing once a tab is selected
        const selectedTab = availableTabs.find(tab => tab.id === tabId);
        if (selectedTab) {
            shareSelectedTab();
        }
    }

    // Share selected tab audio
    async function shareSelectedTab() {
        try {
            // In a real implementation, this would use chrome.tabCapture.capture
            // or similar API to capture the specific tab's audio
            // For this demo, we'll use getDisplayMedia() which prompts the user to select a tab
            
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                audio: true,
                video: false
            });
            
            // Check if audio track exists
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert('No audio track found. Please make sure to select "Share tab audio" when prompted.');
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            
            // Hide tab selector
            tabSelectorDiv.classList.add('hidden');
            
            startSharing(stream);
        } catch (err) {
            console.error('Error accessing tab audio:', err);
            alert('Could not access tab audio. Please check permissions.');
        }
    }

    // Share tab audio (initial function that shows tab selector)
    function shareTabAudio() {
        showTabSelector();
    }

    // Start sharing the audio stream
    function startSharing(stream) {
        myStream = stream;
        
        // Initialize PeerJS if not already initialized
        if (!peer) {
            const peerId = initPeer();
            
            // Generate room link
            const roomLink = window.location.href.split('?')[0] + '?room=' + peerId;
            roomLinkInput.value = roomLink;
            
            // Generate QR code
            generateQRCode(roomLink);
            
            // Add current user to connected users
            if (currentUser) {
                addConnectedUser({...currentUser}, peerId);
            }
        }
        
        // Show room created UI
        roomCreatedDiv.classList.remove('hidden');
        
        // Call all connected peers
        connections.forEach(conn => {
            callPeer(conn.peer, stream);
        });
    }

    // Call a peer with the audio stream
    function callPeer(peerId, stream) {
        const call = peer.call(peerId, stream);
        console.log('Calling peer:', peerId);
    }

    // Generate QR code for the room link
    function generateQRCode(text) {
        // Clear previous QR code
        qrcodeDiv.innerHTML = '';
        
        // Generate QR code using qrcode-generator library
        const qr = qrcode(0, 'L');
        qr.addData(text);
        qr.make();
        
        // Create QR code image
        const qrImage = qr.createImgTag(5);
        qrcodeDiv.innerHTML = qrImage;
    }

    // Join a room
    function joinRoom(roomId) {
        currentRoomId = roomId;
        
        // Check if user is logged in
        if (!currentUser) {
            // Store the room ID to join after login
            sessionStorage.setItem('pendingRoomJoin', roomId);
            
            // Prompt user to sign in
            alert('Please sign in to join the audio session.');
            openAccountModal();
            return;
        }
        
        // Initialize PeerJS if not already initialized
        if (!peer) {
            initPeer();
        }
        
        // Connect to the host peer
        const conn = peer.connect(roomId, {
            metadata: currentUser
        });
        
        conn.on('open', () => {
            console.log('Connected to host peer:', roomId);
            connections.push(conn);
            
            // Show listening UI
            listeningDiv.classList.remove('hidden');
            document.querySelector('.join-form').classList.add('hidden');
            
            // Send user info to host
            conn.send({
                type: 'user-joined',
                user: currentUser
            });
        });
        
        conn.on('data', (data) => {
            console.log('Received data:', data);
            
            if (data.type === 'user-list') {
                updateConnectedUsers(data.users);
            }
        });
        
        conn.on('error', (err) => {
            console.error('Connection error:', err);
            alert(`Could not connect to room: ${err.message}`);
        });
    }

    // Add connected user
    function addConnectedUser(user, peerId) {
        // Check if user already exists
        const existingUserIndex = connectedUsers.findIndex(u => u.peerId === peerId);
        
        if (existingUserIndex !== -1) {
            // Update existing user
            connectedUsers[existingUserIndex] = { ...user, peerId };
        } else {
            // Add new user
            connectedUsers.push({ ...user, peerId });
        }
        
        // Update UI
        renderConnectedUsers();
        
        // Broadcast updated user list to all connections
        broadcastUserList();
    }

    // Remove connected user
    function removeConnectedUser(peerId) {
        connectedUsers = connectedUsers.filter(user => user.peerId !== peerId);
        
        // Update UI
        renderConnectedUsers();
        
        // Broadcast updated user list to all connections
        broadcastUserList();
    }

    // Render connected users
    function renderConnectedUsers() {
        userListDiv.innerHTML = '';
        
        if (connectedUsers.length === 0) {
            userListDiv.innerHTML = '<div class="no-users">No other users connected</div>';
            return;
        }
        
        // Add host first if we're not the host
        if (currentRoomId && currentRoomId !== peer.id) {
            const hostUser = connectedUsers.find(user => user.peerId === currentRoomId);
            if (hostUser) {
                addUserToList(hostUser, true);
            }
        }
        
        // Add other users
        connectedUsers.forEach(user => {
            // Skip host if already added
            if (currentRoomId && currentRoomId !== peer.id && user.peerId === currentRoomId) {
                return;
            }
            
            // Skip current user
            if (peer && user.peerId === peer.id) {
                return;
            }
            
            addUserToList(user);
        });
        
        // Add current user
        if (currentUser && peer) {
            addUserToList({ ...currentUser, peerId: peer.id }, false, true);
        }
    }

    // Add user to list
    function addUserToList(user, isHost = false, isCurrentUser = false) {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const userAvatar = document.createElement('div');
        userAvatar.className = 'user-avatar';
        userAvatar.style.backgroundColor = user.avatarColor;
        userAvatar.textContent = getInitials(user.displayName || user.username);
        
        const userName = document.createElement('div');
        userName.className = 'user-name';
        
        let nameText = user.displayName || user.username;
        if (isHost) {
            nameText += ' (Host)';
        } else if (isCurrentUser) {
            nameText += ' (You)';
        }
        
        userName.textContent = nameText;
        
        userItem.appendChild(userAvatar);
        userItem.appendChild(userName);
        
        userListDiv.appendChild(userItem);
    }

    // Broadcast user list to all connections
    function broadcastUserList() {
        connections.forEach(conn => {
            conn.send({
                type: 'user-list',
                users: connectedUsers
            });
        });
    }

    // Update connected users from received data
    function updateConnectedUsers(users) {
        connectedUsers = users;
        renderConnectedUsers();
    }

    // Play remote audio stream
    function playRemoteStream(stream) {
        // Create audio element if it doesn't exist
        if (!remoteAudio) {
            remoteAudio = new Audio();
            remoteAudio.autoplay = true;
            
            // Set up audio context for visualizer
            setupAudioVisualizer(remoteAudio);
        }
        
        // Set the stream as the source
        remoteAudio.srcObject = stream;
        
        // Apply volume
        remoteAudio.volume = volumeSlider.value / 100;
    }

    // Set up audio visualizer
    function setupAudioVisualizer(audioElement) {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create analyser node
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        // Connect audio element to analyser
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        // Start visualizer animation
        drawVisualizer();
    }

    // Draw audio visualizer
    function drawVisualizer() {
        if (!analyser || !audioVisualizer) return;
        
        const canvas = audioVisualizer;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Set canvas dimensions
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        function animate() {
            visualizerAnimationId = requestAnimationFrame(animate);
            
            // Get frequency data
            analyser.getByteFrequencyData(dataArray);
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw bars
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 255 * canvas.height;
                
                // Create gradient
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#4a6bff');
                gradient.addColorStop(1, '#ff6b6b');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        animate();
    }

    // Toggle mute
    function toggleMute() {
        if (myStream) {
            const audioTracks = myStream.getAudioTracks();
            
            audioTracks.forEach(track => {
                track.enabled = isMuted;
            });
            
            isMuted = !isMuted;
            
            // Update button text
            muteToggleBtn.querySelector('span:last-child').textContent = isMuted ? 'Unmute' : 'Mute';
            muteToggleBtn.querySelector('span.icon').textContent = isMuted ? '🔇' : '🔊';
        }
    }

    // End session
    function endSession() {
        // Stop all tracks
        if (myStream) {
            myStream.getTracks().forEach(track => track.stop());
            myStream = null;
        }
        
        // Close all connections
        connections.forEach(conn => conn.close());
        connections = [];
        
        // Clear connected users
        connectedUsers = [];
        currentRoomId = null;
        
        // Close peer connection
        if (peer) {
            peer.destroy();
            peer = null;
        }
        
        // Reset UI
        roomCreatedDiv.classList.add('hidden');
        tabSelectorDiv.classList.add('hidden');
        selectedTabId = null;
        isMuted = false;
    }

    // Leave session
    function leaveSession() {
        // Close all connections
        connections.forEach(conn => conn.close());
        connections = [];
        
        // Clear connected users
        connectedUsers = [];
        currentRoomId = null;
        
        // Stop remote audio
        if (remoteAudio) {
            remoteAudio.pause();
            remoteAudio.srcObject = null;
            remoteAudio = null;
        }
        
        // Close peer connection
        if (peer) {
            peer.destroy();
            peer = null;
        }
        
        // Cancel visualizer animation
        if (visualizerAnimationId) {
            cancelAnimationFrame(visualizerAnimationId);
        }
        
        // Reset UI
        listeningDiv.classList.add('hidden');
        document.querySelector('.join-form').classList.remove('hidden');
    }

    // Check URL for room parameter
    function checkUrlForRoom() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        
        if (roomId) {
            // Switch to join tab
            switchTab('join');
            
            // Set room ID in input
            joinLinkInput.value = roomId;
            
            // Auto-join room
            joinRoom(roomId);
        }
    }

    // Switch tab
    function switchTab(tabId) {
        // Update tab buttons
        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });
        
        // Update tab panes
        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === tabId);
        });
    }

    // Load ads
    function loadAds() {
        // In a real implementation, this would load actual ads from an ad network
        // For this demo, we're using placeholder images
        
        // You could implement ad rotation, tracking, etc. here
        console.log('Advertisements loaded');
    }

    // Color selection
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove selected class from all options
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            option.classList.add('selected');
            
            // Update selected color
            selectedColor = option.dataset.color;
        });
    });

    // Initialize the first color as selected
    colorOptions[0].classList.add('selected');

    // Event Listeners
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    shareMicBtn.addEventListener('click', shareMicrophone);
    shareTabBtn.addEventListener('click', shareTabAudio);
    
    refreshTabsBtn.addEventListener('click', loadAvailableTabs);
    
    copyLinkBtn.addEventListener('click', () => {
        roomLinkInput.select();
        document.execCommand('copy');
        alert('Link copied to clipboard!');
    });
    
    muteToggleBtn.addEventListener('click', toggleMute);
    endSessionBtn.addEventListener('click', endSession);
    
    joinBtn.addEventListener('click', () => {
        const input = joinLinkInput.value.trim();
        
        // Extract room ID from link if it's a full URL
        let roomId;
        if (input.includes('?room=')) {
            roomId = input.split('?room=')[1];
        } else {
            roomId = input;
        }
        
        if (roomId) {
            joinRoom(roomId);
        } else {
            alert('Please enter a valid room ID or link.');
        }
    });
    
    volumeSlider.addEventListener('input', () => {
        if (remoteAudio) {
            remoteAudio.volume = volumeSlider.value / 100;
        }
    });
    
    leaveSessionBtn.addEventListener('click', leaveSession);
    
    // Account related event listeners
    accountBtn.addEventListener('click', openAccountModal);
    
    closeModal.addEventListener('click', closeAccountModal);
    
    accountModal.addEventListener('click', (e) => {
        if (e.target === accountModal) {
            closeAccountModal();
        }
    });
    
    saveAccountBtn.addEventListener('click', () => {
        const username = usernameInput.value.trim();
        const displayName = displayNameInput.value.trim();
        
        if (!username) {
            alert('Please enter a username.');
            return;
        }
        
        // Save user data
        const user = {
            username,
            displayName,
            avatarColor: selectedColor,
            createdAt: new Date().toISOString()
        };
        
        saveUserToStorage(user);
        updateUIForLoggedInUser();
        closeAccountModal();
        
        // Check if there's a pending room join
        const pendingRoomId = sessionStorage.getItem('pendingRoomJoin');
        if (pendingRoomId) {
            sessionStorage.removeItem('pendingRoomJoin');
            joinRoom(pendingRoomId);
        }
    });
    
    logoutBtn.addEventListener('click', logout);

    // Initialize the app
    init();
}); 