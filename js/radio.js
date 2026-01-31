/* =====================================================
   🎧👩‍💻 LifeArena – Radio Chatbot (ULTRA PREMIUM EDITION)
   Conversational • Intelligent • Offline • Enhanced
   Version: 2.0.0
===================================================== */

/* =========================
   🚀 INITIALIZATION
========================= */
import { playlists } from "../data/playlists.js";

const RadioBot = (() => {
  "use strict";
  // App state
  const state = {
    currentMood: "calm",
    currentSongIndex: 0,
    isPlaying: false,
    volume: 40,
    isMuted: false,
    previousVolume: 40,
    repeatMode: "none", // none, one, all
    shuffleMode: false,
    lastSongs: []
  };

  // DOM Elements
  const player = document.getElementById("bgPlayer");
  let musicPopup = null;

  /* =========================
     🔊 AUDIO CONTROLLER
  ========================= */

  class AudioController {
    constructor() {
      if (!player) throw new Error("Audio player element not found");
      
      player.volume = state.volume / 100;
      player.preload = "auto";
      
      this.setupEventListeners();
    }

    setupEventListeners() {
      player.addEventListener('play', () => {
        state.isPlaying = true;
        this.updatePlayButton();
      });

      player.addEventListener('pause', () => {
        state.isPlaying = false;
        this.updatePlayButton();
      });

      player.addEventListener('ended', () => this.handleSongEnd());
      player.addEventListener('error', (e) => this.handleAudioError(e));
      player.addEventListener('timeupdate', () => this.updateProgress());
    }

    play(song) {
      try {
        if (song.file === player.src.split('/').pop()) {
          if (player.paused) {
            player.play();
          } else {
            player.pause();
          }
        } else {
          player.src = song.file;
          player.play().then(() => {
            console.log(`Playing: ${song.name}`);
            this.updateNowPlaying(song);
          }).catch(error => {
            console.error("Playback error:", error);
            say("🔇 Please click play to allow audio autoplay");
          });
        }
      } catch (error) {
        console.error("Play error:", error);
        say("⚠️ Error playing song");
      }
    }

    pause() {
      player.pause();
      state.isPlaying = false;
    }

    togglePlay() {
      showMusicPopup();
      if (player.paused) {
        player.play();
      } else {
        player.pause();
      }
    }

    setVolume(percent) {
      const volume = Math.min(100, Math.max(0, parseInt(percent) || 40));
      state.volume = volume;
      player.volume = volume / 100;
      
      // Update visual slider
      const slider = document.querySelector('#musicPopup input[type="range"]');
      if (slider) slider.value = volume;
      
      this.updateVolumeIcon();
      localStorage.setItem('radioVolume', volume);
    }

    toggleMute() {
      if (state.isMuted) {
        player.volume = state.previousVolume / 100;
        state.volume = state.previousVolume;
        state.isMuted = false;
      } else {
        state.previousVolume = state.volume;
        player.volume = 0;
        state.volume = 0;
        state.isMuted = true;
      }
      this.updateVolumeIcon();
    }

    updateVolumeIcon() {
      const icon = document.querySelector('#musicPopup .volume-icon');
      if (icon) {
        if (state.volume === 0 || state.isMuted) {
          icon.textContent = '🔇';
        } else if (state.volume < 30) {
          icon.textContent = '🔈';
        } else if (state.volume < 70) {
          icon.textContent = '🔉';
        } else {
          icon.textContent = '🔊';
        }
      }
    }

    handleSongEnd() {
      if (state.repeatMode === "one") {
        player.currentTime = 0;
        player.play();
      } else if (state.shuffleMode) {
        this.playRandom();
      } else {
        RadioBot.next();
      }
    }

    handleAudioError(e) {
      console.error("Audio error:", e);
      say("⚠️ Error loading audio. Trying next song...");
      setTimeout(() => RadioBot.next(), 1000);
    }

    updateNowPlaying(song) {
      const title = document.querySelector('#musicPopup .now-playing');
      if (title) {
        title.innerHTML = `${playlists[state.currentMood].emoji} <b>${song.name}</b> • ${playlists[state.currentMood].name}`;
      }
      
      // Add to history
      state.lastSongs.unshift({
        name: song.name,
        mood: state.currentMood,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      
      if (state.lastSongs.length > 5) state.lastSongs.pop();
    }

    updatePlayButton() {
      const btn = document.querySelector('#musicPopup .play-btn');
      if (btn) {
        btn.textContent = state.isPlaying ? '⏸️' : '▶️';
      }
    }

    updateProgress() {
      if (!player.duration) return;
      
      const progress = (player.currentTime / player.duration) * 100;
      const bar = document.querySelector('#musicPopup .progress-bar');
      if (bar) {
        bar.style.width = `${progress}%`;
      }
      
      // Update time display
      const timeDisplay = document.querySelector('#musicPopup .time-display');
      if (timeDisplay) {
        const current = this.formatTime(player.currentTime);
        const total = this.formatTime(player.duration);
        timeDisplay.textContent = `${current} / ${total}`;
      }
    }

    formatTime(seconds) {
      if (isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }

  const audioController = new AudioController();

  /* =========================
     🎵 PLAYLIST MANAGER
  ========================= */

  function getCurrentPlaylist() {
    return playlists[state.currentMood];
  }

  function getCurrentSong() {
    return getCurrentPlaylist().songs[state.currentSongIndex];
  }

  function playSong(song) {
    if (!song) return false;
    
    audioController.play(song);
    localStorage.setItem("lastSong", JSON.stringify({
      name: song.name,
      mood: state.currentMood,
      index: state.currentSongIndex
    }));
    
    showMusicPopup();
    return true;
  }

  function playRandom() {
    const playlist = getCurrentPlaylist();
    if (!playlist.songs.length) {
      say("🎵 No songs available");
      return;
    }
    
    state.currentSongIndex = Math.floor(Math.random() * playlist.songs.length);
    playSong(playlist.songs[state.currentSongIndex]);
  }

  function next() {
    const playlist = getCurrentPlaylist();
    if (state.shuffleMode) {
      state.currentSongIndex = Math.floor(Math.random() * playlist.songs.length);
    } else {
      state.currentSongIndex = (state.currentSongIndex + 1) % playlist.songs.length;
    }
    playSong(playlist.songs[state.currentSongIndex]);
  }

  function previous() {
    const playlist = getCurrentPlaylist();
    state.currentSongIndex = state.currentSongIndex === 0 ? 
      playlist.songs.length - 1 : state.currentSongIndex - 1;
    playSong(playlist.songs[state.currentSongIndex]);
  }

  function setMood(mood) {
    if (!playlists[mood]) {
      say(`🎭 Available moods: ${Object.keys(playlists).map(m => `<b>${m}</b>`).join(', ')}`);
      return false;
    }
    
    state.currentMood = mood;
    state.currentSongIndex = 0;
    
    const playlist = playlists[mood];
    say(`${playlist.emoji} Switching to <b>${playlist.name}</b>: ${playlist.description}`);
    playRandom();
    return true;
  }

  function findSong(query) {
    query = query.toLowerCase();
    
    for (const moodKey in playlists) {
      const playlist = playlists[moodKey];
      const song = playlist.songs.find(s => 
        s.name.toLowerCase().includes(query)
      );
      
      if (song) {
        state.currentMood = moodKey;
        state.currentSongIndex = playlist.songs.indexOf(song);
        playSong(song);
        return true;
      }
    }
    
    // Try fuzzy search
    for (const moodKey in playlists) {
      const playlist = playlists[moodKey];
      for (const song of playlist.songs) {
        if (song.name.toLowerCase().includes(query.substring(0, 3))) {
          state.currentMood = moodKey;
          state.currentSongIndex = playlist.songs.indexOf(song);
          playSong(song);
          return true;
        }
      }
    }
    
    return false;
  }

  /* =========================
     🎨 POPUP ENHANCEMENTS
  ========================= */

  function showMusicPopup() {
    if (!musicPopup) initializePopup();
    
    musicPopup.classList.remove("hidden");
    updatePopupUI();
    
    // Auto-hide after 5 seconds if not interacting
    clearTimeout(window.popupHideTimeout);
    window.popupHideTimeout = setTimeout(() => {
      if (!musicPopup.matches(':hover') && !state.isPlaying) {
        musicPopup.classList.add("hidden");
      }
    }, 5000);
  }

  function initializePopup() {
    musicPopup = document.getElementById("musicPopup");
    if (!musicPopup) return;
    
    // Enhanced popup HTML
    musicPopup.innerHTML = `
      <div class="popup-header">
        <div class="now-playing">${playlists[state.currentMood].emoji} Now Playing</div>
        <button class="close-music" title="Close">✖</button>
      </div>
      
      <div class="progress-container">
        <div class="progress-bar"></div>
      </div>
      
      <div class="controls">
        <button class="control-btn shuffle-btn" title="Shuffle">🔀</button>
        <button class="control-btn prev-btn" title="Previous">⏮️</button>
        <button class="control-btn play-btn" title="Play/Pause">${state.isPlaying ? '⏸️' : '▶️'}</button>
        <button class="control-btn next-btn" title="Next">⏭️</button>
        <button class="control-btn repeat-btn" title="Repeat">🔁</button>
      </div>
      
      <div class="bottom-controls">
        <div class="volume-control">
          <button class="volume-icon">${state.volume === 0 ? '🔇' : '🔊'}</button>
          <input type="range" min="0" max="100" value="${state.volume}" 
                 class="volume-slider" title="Volume">
        </div>
        <div class="time-display">0:00 / 0:00</div>
        <button class="mood-btn" title="Change Mood">${playlists[state.currentMood].emoji}</button>
      </div>
    `;
      const closeBtn = musicPopup.querySelector(".close-music");
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    musicPopup.classList.add("hidden");
    say("🎧 Player hidden. Click 🎵 or type <b>open player</b> to reopen.");
  };

    // Attach event listeners
    attachPopupEvents();
    setupDragAndDrop();
  }

  function updatePopupUI() {
    if (!musicPopup) return;
    
    const playlist = getCurrentPlaylist();
    const song = getCurrentSong();

    const nowPlaying = musicPopup.querySelector('.now-playing');
    if (nowPlaying && song) {
      nowPlaying.innerHTML = `${playlist.emoji} <b>${song.name}</b> • ${playlist.name}`;
    }
    
    const moodBtn = musicPopup.querySelector('.mood-btn');
    if (moodBtn) {
      moodBtn.textContent = playlist.emoji;
      moodBtn.style.backgroundColor = playlist.color + '20';
    }
    
    audioController.updatePlayButton();
    audioController.updateVolumeIcon();
  }

  function attachPopupEvents() {
    // Play/Pause
    const playBtn = musicPopup.querySelector('.play-btn');
    if (playBtn) {
      playBtn.onclick = () => audioController.togglePlay();
    }
    
    // Next/Previous
    musicPopup.querySelector('.next-btn').onclick = next;
    musicPopup.querySelector('.prev-btn').onclick = previous;
    
    // Volume slider
    const volumeSlider = musicPopup.querySelector('.volume-slider');
    if (volumeSlider) {
      volumeSlider.oninput = (e) => audioController.setVolume(e.target.value);
    }
    
    // Volume icon (mute toggle)
    const volumeIcon = musicPopup.querySelector('.volume-icon');
    if (volumeIcon) {
      volumeIcon.onclick = () => audioController.toggleMute();
    }
    
    // Shuffle
    const shuffleBtn = musicPopup.querySelector('.shuffle-btn');
    if (shuffleBtn) {
      shuffleBtn.onclick = () => {
        state.shuffleMode = !state.shuffleMode;
        shuffleBtn.style.opacity = state.shuffleMode ? '1' : '0.5';
        say(state.shuffleMode ? "🔀 Shuffle mode ON" : "🔀 Shuffle mode OFF");
      };
      shuffleBtn.style.opacity = state.shuffleMode ? '1' : '0.5';
    }
    
    // Repeat
    const repeatBtn = musicPopup.querySelector('.repeat-btn');
    if (repeatBtn) {
      repeatBtn.onclick = () => {
        const modes = ["none", "one", "all"];
        const currentIndex = modes.indexOf(state.repeatMode);
        state.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        repeatBtn.textContent = state.repeatMode === "none" ? "🔁" : 
                               state.repeatMode === "one" ? "🔂" : "🔄";
        say(`Repeat: ${state.repeatMode}`);
      };
    }
    
    // Mood button
    const moodBtn = musicPopup.querySelector('.mood-btn');
    if (moodBtn) {
      moodBtn.onclick = () => {
        const moods = Object.keys(playlists);
        const currentIndex = moods.indexOf(state.currentMood);
        const nextMood = moods[(currentIndex + 1) % moods.length];
        setMood(nextMood);
      };
    }
  }

  /* =========================
     🧲 DRAGGABLE POPUP
  ========================= */

function setupDragAndDrop() {
  let isDragging = false;
  let startX = 0, startY = 0;
  let x = 0, y = 0;

  musicPopup.addEventListener("mousedown", (e) => {
    if (e.target.closest("button") || e.target.type === "range") return;

    isDragging = true;
    startX = e.clientX - x;
    startY = e.clientY - y;

    musicPopup.style.cursor = "grabbing";
    musicPopup.style.transition = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    x = e.clientX - startX;
    y = e.clientY - startY;

    musicPopup.style.transform = `translate(${x}px, ${y}px)`;
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;

    isDragging = false;
    musicPopup.style.cursor = "grab";
    musicPopup.style.transition = "transform 0.25s ease";

    // save position
    localStorage.setItem("radioPopupPos", JSON.stringify({ x, y }));
  });

  // restore saved position
  const saved = localStorage.getItem("radioPopupPos");
  if (saved) {
    const pos = JSON.parse(saved);
    x = pos.x || 0;
    y = pos.y || 0;
    musicPopup.style.transform = `translate(${x}px, ${y}px)`;
  }
}


  /* =========================
     📚 ENHANCED FAQ SYSTEM
  ========================= */

  let FAQ_DATA = [];
  const intents = {
    greetings: ["hello", "hi", "hey", "greetings"],
    thanks: ["thank", "thanks", "appreciate"],
    goodbyes: ["bye", "goodbye", "see you", "exit"]
  };

  function loadFAQ() {
    fetch("./faq.json")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => FAQ_DATA = data.faqs || [])
      .catch(() => {
        console.warn("FAQ not loaded, using defaults");
        FAQ_DATA = [
          {
            question: "What is BookVault?",
            keywords: ["bookvault", "what is", "explain"],
            answer: "📚 BookVault is your digital library for organizing and accessing your favorite books!"
          }
        ];
      });
  }

function answerFAQ(msg) {
  const lowerMsg = msg.toLowerCase();

  // ✅ 1. FAQ FIRST (MOST IMPORTANT)
  for (const faq of FAQ_DATA) {
    if (faq.keywords?.some(k => lowerMsg.includes(k.toLowerCase()))) {
      say(faq.answer);
      return true;
    }
  }

  // 👋 2. Greetings (ONLY if message is SHORT)
  if (
    lowerMsg.length < 10 &&
    intents.greetings.some(g => lowerMsg === g)
  ) {
    const greetings = ["Hello! 👋", "Hi there! 📘", "Hey! Ask me about the book 😊"];
    say(greetings[Math.floor(Math.random() * greetings.length)]);
    return true;
  }

  // 🙏 3. Thanks
  if (intents.thanks.some(t => lowerMsg.includes(t))) {
    say("You're welcome 😊 Happy reading!");
    return true;
  }

  // 👋 4. Goodbye
  if (intents.goodbyes.some(g => lowerMsg.includes(g))) {
    say("Goodbye 👋 Come back anytime to read!");
    return true;
  }

  return false;
}


  /* =========================
     💬 ENHANCED CHAT UI
  ========================= */

  const radioBtn = document.getElementById("radioBtn");
  const panel = document.getElementById("radioPanel");
  const input = document.getElementById("radioInput");
  const messages = document.getElementById("radioMessages");

  if (radioBtn) {
    radioBtn.onclick = () => {
      panel.style.display = panel.style.display === "flex" ? "none" : "flex";
      
      if (panel.style.display === "flex") {
        say("🎧 Ready when you are! Try 'play music' or ask me anything!");
        input.focus();
      }
    };
  }

  // Enhanced typing effect
  function say(text, bot = true) {
    const div = document.createElement("div");
    div.className = bot ? "bot-message" : "user-message";
    div.innerHTML = `${bot ? "👩‍💻" : "🧑"} `;
    messages.appendChild(div);

    if (!bot) {
      div.innerHTML += text;
      messages.scrollTop = messages.scrollHeight;
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      div.innerHTML = `👩‍💻 ` + text.slice(0, i++);
      messages.scrollTop = messages.scrollHeight;
      if (i > text.length) {
        clearInterval(interval);
        div.innerHTML = `👩‍💻 ` + text;
      }
    }, 16);
  }

  /* =========================
     🧠 ENHANCED INTENT ENGINE
  ========================= */

  function processCommand(msg) {
    const lowerMsg = msg.toLowerCase().trim();
    
    // Handle empty message
    if (!lowerMsg) return false;
    
    // Try FAQ first
    if (answerFAQ(lowerMsg)) return true;
    
    // Music commands
    if (lowerMsg === "play" || lowerMsg.includes("play music") || lowerMsg === "start") {
      if (state.isPlaying) {
        say("🎵 Music is already playing!");
      } else {
        playRandom();
      }
      return true;
    }
    
    if (lowerMsg.startsWith("play ")) {
      const query = lowerMsg.replace("play ", "").trim();
      if (findSong(query)) {
        say(`🔍 Found and playing: <b>${getCurrentSong().name}</b>`);
      } else {
        say(`🔎 No song found for "${query}". Try: <i>play grateful</i>`);
      }
      return true;
    }
    
    if (lowerMsg.includes("pause") || lowerMsg === "stop") {
      audioController.pause();
      say("⏸️ Paused");
      return true;
    }
    
    if (lowerMsg.includes("next") || lowerMsg === "skip") {
      next();
      return true;
    }
    
    if (lowerMsg.includes("previous") || lowerMsg === "back") {
      previous();
      return true;
    }
    if (
  lowerMsg === "open player" ||
  lowerMsg === "show player" ||
  lowerMsg === "open music"
) {
  showMusicPopup();
  say("🎵 Music player opened");
  return true;
}

    if (lowerMsg.includes("volume")) {
      const match = lowerMsg.match(/\d+/);
      if (match) {
        audioController.setVolume(match[0]);
        say(`🔊 Volume set to ${match[0]}%`);
      } else if (lowerMsg.includes("up")) {
        audioController.setVolume(Math.min(100, state.volume + 20));
        say(`🔊 Volume increased to ${state.volume}%`);
      } else if (lowerMsg.includes("down")) {
        audioController.setVolume(Math.max(0, state.volume - 20));
        say(`🔊 Volume decreased to ${state.volume}%`);
      } else if (lowerMsg.includes("mute")) {
        audioController.toggleMute();
        say(state.isMuted ? "🔇 Muted" : "🔊 Unmuted");
      }
      return true;
    }
    
    if (lowerMsg.startsWith("mood") || lowerMsg.startsWith("switch to")) {
      const mood = lowerMsg.split(" ").pop();
      if (setMood(mood)) {
        say(`🎭 Switched to <b>${playlists[mood].name}</b> mode!`);
      }
      return true;
    }
    
    if (lowerMsg.includes("shuffle")) {
      state.shuffleMode = !state.shuffleMode;
      say(state.shuffleMode ? "🔀 Shuffle mode ON" : "🔀 Shuffle mode OFF");
      return true;
    }
    
    if (lowerMsg.includes("repeat")) {
      const modes = ["none", "one", "all"];
      const currentIndex = modes.indexOf(state.repeatMode);
      state.repeatMode = modes[(currentIndex + 1) % modes.length];
      say(`🔁 Repeat: <b>${state.repeatMode}</b>`);
      return true;
    }
    
    if (lowerMsg.includes("what can you do") || lowerMsg === "help" || lowerMsg === "commands") {
      say(`
        <div class="commands-list">
          <b>🎵 Music Commands:</b>
          <br>• <code>play</code> / <code>pause</code> / <code>next</code> / <code>previous</code>
          <br>• <code>play [song name]</code>
          <br>• <code>volume [0-100]</code> or <code>volume up/down</code>
          <br>• <code>mood calm|focus|night</code>
          <br>• <code>shuffle</code> / <code>repeat</code>
          <br>• <code>what's playing</code>
          
          <br><br><b>💬 General:</b>
          <br>• <code>help</code> - Show this menu
          <br>• <code>about</code> - About this radio
          <br>• <code>history</code> - Recent songs
        </div>
      `);
      return true;
    }
    
    if (lowerMsg.includes("what's playing") || lowerMsg.includes("now playing")) {
      const song = getCurrentSong();
      const playlist = getCurrentPlaylist();
      if (song) {
        say(`🎶 Now playing: <b>${song.name}</b> from <b>${playlist.name}</b>`);
      } else {
        say("🎵 Nothing is playing right now");
      }
      return true;
    }
    
    if (lowerMsg.includes("history") || lowerMsg.includes("recent")) {
      if (state.lastSongs.length === 0) {
        say("📜 No recent songs");
      } else {
        const history = state.lastSongs.map((s, i) => 
          `${i+1}. ${s.name} (${s.mood}) - ${s.timestamp}`
        ).join('<br>');
        say(`📜 Recent songs:<br>${history}`);
      }
      return true;
    }
    
    if (lowerMsg.includes("about") || lowerMsg.includes("version")) {
      say(`
        <b>🎧 LifeArena Radio v2.0</b>
        <br>• Intelligent music chatbot
        <br>• Multiple mood playlists
        <br>• Offline capable
        <br>• Drag & drop controls
        <br>• Smart conversation
      `);
      return true;
    }
    
    // Default fallback
    const suggestions = [
      "play music",
      "mood focus",
      "volume 60",
      "what can you do",
      "play grateful"
    ];
    
    say(`
      🤔 I didn't understand that. Try:
      <br>• <code>${suggestions[Math.floor(Math.random() * suggestions.length)]}</code>
      <br>• <code>help</code> for all commands
    `);
    
    return false;
  }

  /* =========================
     🚀 INITIALIZATION
  ========================= */

  function init() {
    // Load saved settings
    const savedVolume = localStorage.getItem('radioVolume');
    if (savedVolume) audioController.setVolume(savedVolume);
    
    const savedMood = localStorage.getItem('radioMood');
    if (savedMood && playlists[savedMood]) state.currentMood = savedMood;
    
    // Load last song
    const lastSong = localStorage.getItem("lastSong");
    if (lastSong) {
      try {
        const { name, mood, index } = JSON.parse(lastSong);
        if (playlists[mood] && playlists[mood].songs[index]) {
          state.currentMood = mood;
          state.currentSongIndex = index;
          say(`Welcome back! 👋 Last played <b>${name}</b>`);
        }
      } catch (e) {
        console.error("Error loading last song:", e);
      }
    }
    
    // Load FAQ
    loadFAQ();
    
    // Setup input handler
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        
        const msg = input.value.trim();
        if (!msg) return;
        
        input.value = "";
        say(msg, false);
        
        setTimeout(() => processCommand(msg), 100);
      });
      
      // Add click to focus
      radioBtn?.addEventListener('click', () => {
        setTimeout(() => input.focus(), 100);
      });
    }
    
    // Initialize popup
    setTimeout(initializePopup, 100);
    
    console.log("🎧 RadioBot initialized successfully!");
  }

  /* =========================
     📤 PUBLIC API
  ========================= */

  return {
    // Playback controls
    play: () => audioController.togglePlay(),
    pause: audioController.pause.bind(audioController),
    playRandom,
    next,
    previous,
    setMood,
    setVolume: audioController.setVolume.bind(audioController),
    toggleMute: audioController.toggleMute.bind(audioController),
    findSong,
    
    // Getters
    getState: () => ({ ...state }),
    getCurrentSong: () => ({ ...getCurrentSong() }),
    getCurrentPlaylist: () => ({ ...getCurrentPlaylist() }),
    
    // UI
    showPopup: showMusicPopup,
    hidePopup: () => musicPopup?.classList.add("hidden"),
    
    // Initialization
    init
  };
  window.RadioBot = RadioBot;
})();

/* =========================
   🌟 DOM READY
========================= */

document.addEventListener("DOMContentLoaded", () => {
  // Safety timeout for initialization
  setTimeout(() => {
    try {
      RadioBot.init();
    } catch (error) {
      console.error("RadioBot initialization failed:", error);
      
      // Fallback UI
      const radioBtn = document.getElementById("radioBtn");
      if (radioBtn) {
        radioBtn.onclick = () => {
          alert("🎧 Radio is initializing... Please refresh the page.");
        };
      }
    }
  }, 500);
});

/* =========================
   📱 TOUCH SUPPORT
========================= */

document.addEventListener('touchstart', () => {
  // Ensure audio can play on iOS
  const audio = document.getElementById('bgPlayer');
  if (audio && audio.paused) {
    audio.play().then(() => audio.pause()).catch(() => {});
  }
}, { once: true });

/* =========================
   🎯 GLOBAL ERROR HANDLER
========================= */

window.addEventListener('error', (e) => {
  console.error('Global error caught:', e.error);
  // Don't show error messages to user for minor issues
});

console.log("🎧 RadioBot v2.0 loaded successfully!");