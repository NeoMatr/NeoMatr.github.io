# AudioShare

AudioShare is a simple web application that allows users to share audio with others through a link or QR code. It's perfect for meetings, classrooms, or sharing music with friends.

## Features

- **User Accounts**: Create a local profile to identify yourself in sessions
- **Session Lobby**: Browse active audio sessions and join with a single click
- **Share Microphone Audio**: Share your voice through your microphone
- **Share Tab Audio**: Share audio from a specific browser tab (e.g., YouTube, Spotify, Netflix)
- **Tab Selection**: Choose exactly which tab you want to share audio from
- **Easy Sharing**: Generate a link or QR code to share with others
- **No Installation Required**: Works directly in the browser
- **Audio Visualizer**: Visual representation of the audio being played
- **Volume Control**: Adjust the volume of the received audio
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

### Creating an Account

1. Click the "Sign In" button in the header
2. Enter a username and display name
3. Choose an avatar color
4. Click "Save Profile"
5. Your account will be stored locally on your device

### Hosting Audio

1. Sign in to your account
2. Click on the "Host Audio" tab (default)
3. Choose your audio source:
   - **Microphone**: Share your voice
   - **Tab Audio**: Share audio from a browser tab
4. If you select "Tab Audio", you'll see a list of available tabs with audio content
5. Select the specific tab you want to share audio from
6. Grant the necessary permissions when prompted
7. A unique room link and QR code will be generated
8. Share this link or QR code with others
9. Use the mute button to temporarily stop sharing audio
10. Click "End Session" when you're done

### Joining Audio

1. Open the link shared with you, or
2. Go to the AudioShare website
3. Click on the "Join Session" tab
4. Enter the room ID or paste the full link
5. Click "Join"
6. You'll start hearing the shared audio
7. Use the volume slider to adjust the volume
8. Click "Leave Session" when you're done

## Technical Details

AudioShare uses the following technologies:

- **HTML5, CSS3, and JavaScript**: For the user interface and functionality
- **WebRTC (via PeerJS)**: For real-time audio communication
- **Web Audio API**: For audio processing and visualization
- **QR Code Generator**: For generating QR codes

## Browser Compatibility

AudioShare works best on modern browsers:

- Google Chrome (recommended)
- Microsoft Edge
- Mozilla Firefox (limited tab audio support)
- Safari (limited support)

## Limitations

- Tab audio sharing is currently only supported in Chrome and Edge
- Specific tab selection requires Chrome with proper permissions
- Some features may require HTTPS to work properly
- Audio quality depends on the network connection

## Privacy

AudioShare uses peer-to-peer technology, which means:

- Audio data is transferred directly between users
- No audio data is stored on any server
- Sessions are temporary and end when the host closes the session

## Advertisements

AudioShare is supported by advertisements displayed on the sides of the application. These advertisements:

- Are displayed in a non-intrusive manner
- Do not interfere with the core functionality
- Help keep the service free for all users
- Are automatically hidden on smaller screens for better mobile experience

## Getting Started

To run AudioShare locally:

1. Clone this repository
2. Open `index.html` in your browser
3. For the best experience, use a local server (e.g., Live Server extension in VS Code)

## License

This project is open source and available under the MIT License. 