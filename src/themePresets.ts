import { ColorSchemePreset, CustomColors } from './types';

export const defaultColors: CustomColors = {
  background: '#090e17', // Dark navy background
  sidebar: '#0f172a',    // Deep slate/navy
  card: '#131e33',       // Navy surface card
  border: '#1e293b',     // Navy border
  text: '#f8fafc',       // High contrast white
  textMuted: '#94a3b8',  // Soft slate
  accent: '#38bdf8',     // Sky blue accent
  bubbleSelf: '#1d4ed8', // Self message bubble
  bubbleOther: '#1e293b',// Other message bubble
  nameSelf: '#60a5fa',   // Lighter blue for self display name/username
  nameOther: '#94a3b8',  // Gray easily readable on dark blue
};

export const CREATOR_STARRY_THEME_CSS = `/* Creator Cosmic Starry Theme */
#chatter-profile-view {
  background: linear-gradient(180deg, rgba(75,59,99,0.97), rgba(50,37,68,0.98)) !important;
  border: 1px solid rgba(200,182,255,0.35);
  border-radius: 20px;
  color: #f1ebff !important;
  line-height: 1.75;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  position: relative;
  overflow-x: hidden;
  box-shadow: 0 0 40px rgba(170,140,255,0.15);
}

#chatter-profile-view .profile-banner {
  background: linear-gradient(180deg, rgba(88,68,118,0.95), rgba(50,37,68,0.98)) !important;
  border-bottom: 1px solid rgba(200,182,255,0.35);
  box-shadow: 0 0 40px rgba(170,140,255,0.15);
}

#chatter-profile-view .profile-avatar {
  border-color: rgba(200,182,255,0.85) !important;
  box-shadow: 0 0 30px rgba(170,140,255,0.5);
}

#chatter-profile-view .profile-display-name {
  color: #f1ebff !important;
  text-shadow: 0 0 16px rgba(200,182,255,0.7);
}

#chatter-profile-view .profile-bio {
  color: #e9dcfc !important;
  line-height: 1.75;
}

#chatter-profile-view .profile-post-card {
  background: rgba(62, 48, 85, 0.72) !important;
  border: 1px solid rgba(200,182,255,0.35) !important;
  border-radius: 20px;
  box-shadow: 0 0 30px rgba(170,140,255,0.12);
  color: #f1ebff;
}

#chatter-profile-view .profile-nav-header {
  background: rgba(50, 37, 68, 0.88) !important;
  border-bottom: 1px solid rgba(200,182,255,0.35) !important;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,245,255,0.95);
  animation: twinkle infinite ease-in-out alternate;
  pointer-events: none;
}

.star:nth-child(1){width:5px;height:5px;top:5%;left:8%;animation:twinkle 4s infinite alternate;}
.star:nth-child(2){width:6px;height:6px;top:10%;left:22%;animation:twinkle 5s infinite alternate;}
.star:nth-child(3){width:4px;height:4px;top:15%;left:35%;animation:twinkle 3.8s infinite alternate;}
.star:nth-child(4){width:7px;height:7px;top:8%;left:48%;animation:twinkle 6s infinite alternate;}
.star:nth-child(5){width:5px;height:5px;top:12%;left:60%;animation:twinkle 4.2s infinite alternate;}
.star:nth-child(6){width:6px;height:6px;top:18%;left:72%;animation:twinkle 5.4s infinite alternate;}
.star:nth-child(7){width:4px;height:4px;top:6%;left:84%;animation:twinkle 3.5s infinite alternate;}
.star:nth-child(8){width:7px;height:7px;top:20%;left:92%;animation:twinkle 6.1s infinite alternate;}

.star:nth-child(9){width:5px;height:5px;top:28%;left:5%;animation:twinkle 4.8s infinite alternate;}
.star:nth-child(10){width:6px;height:6px;top:32%;left:16%;animation:twinkle 5.7s infinite alternate;}
.star:nth-child(11){width:4px;height:4px;top:25%;left:28%;animation:twinkle 3.9s infinite alternate;}
.star:nth-child(12){width:7px;height:7px;top:38%;left:40%;animation:twinkle 6.3s infinite alternate;}
.star:nth-child(13){width:5px;height:5px;top:30%;left:55%;animation:twinkle 4.5s infinite alternate;}
.star:nth-child(14){width:6px;height:6px;top:40%;left:68%;animation:twinkle 5.1s infinite alternate;}
.star:nth-child(15){width:4px;height:4px;top:34%;left:80%;animation:twinkle 3.6s infinite alternate;}
.star:nth-child(16){width:7px;height:7px;top:26%;left:90%;animation:twinkle 6.4s infinite alternate;}

.star:nth-child(17){width:5px;height:5px;top:48%;left:10%;animation:twinkle 4.1s infinite alternate;}
.star:nth-child(18){width:6px;height:6px;top:55%;left:20%;animation:twinkle 5.9s infinite alternate;}
.star:nth-child(19){width:4px;height:4px;top:60%;left:32%;animation:twinkle 3.7s infinite alternate;}
.star:nth-child(20){width:7px;height:7px;top:50%;left:44%;animation:twinkle 6.5s infinite alternate;}
.star:nth-child(21){width:5px;height:5px;top:58%;left:58%;animation:twinkle 4.9s infinite alternate;}
.star:nth-child(22){width:6px;height:6px;top:46%;left:70%;animation:twinkle 5.3s infinite alternate;}
.star:nth-child(23){width:4px;height:4px;top:62%;left:82%;animation:twinkle 3.4s infinite alternate;}
.star:nth-child(24){width:7px;height:7px;top:54%;left:94%;animation:twinkle 6.2s infinite alternate;}

.star:nth-child(25){width:5px;height:5px;top:72%;left:6%;animation:twinkle 4.4s infinite alternate;}
.star:nth-child(26){width:6px;height:6px;top:78%;left:18%;animation:twinkle 5.6s infinite alternate;}
.star:nth-child(27){width:4px;height:4px;top:84%;left:30%;animation:twinkle 3.3s infinite alternate;}
.star:nth-child(28){width:7px;height:7px;top:70%;left:42%;animation:twinkle 6.6s infinite alternate;}
.star:nth-child(29){width:5px;height:5px;top:88%;left:54%;animation:twinkle 4.6s infinite alternate;}
.star:nth-child(30){width:6px;height:6px;top:76%;left:66%;animation:twinkle 5s infinite alternate;}
.star:nth-child(31){width:4px;height:4px;top:90%;left:78%;animation:twinkle 3.2s infinite alternate;}
.star:nth-child(32){width:7px;height:7px;top:82%;left:90%;animation:twinkle 6.7s infinite alternate;}

@keyframes twinkle{
0%{
opacity:0.6;
transform:scale(1);
box-shadow:0 0 5px rgba(255,255,255,0.3);
}
50%{
opacity:1;
transform:scale(1.25);
box-shadow:0 0 18px rgba(255,255,255,1);
}
100%{
opacity:0.8;
transform:scale(1.05);
box-shadow:0 0 10px rgba(255,255,255,0.6);
}
}`;

export const COLOR_PRESETS: ColorSchemePreset[] = [
  // 10 DARK MODE SCHEMES
  {
    id: 'navy-deep',
    name: 'Navy Deep (Default)',
    mode: 'dark',
    colors: { ...defaultColors }
  },
  {
    id: 'midnight-abyss',
    name: 'Midnight Abyss',
    mode: 'dark',
    colors: {
      background: '#030712',
      sidebar: '#0b0f19',
      card: '#111827',
      border: '#1f2937',
      text: '#f9fafb',
      textMuted: '#9ca3af',
      accent: '#6366f1',
      bubbleSelf: '#4338ca',
      bubbleOther: '#1f2937',
      nameSelf: '#818cf8',
      nameOther: '#9ca3af',
    }
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    mode: 'dark',
    colors: {
      background: '#0d0914',
      sidebar: '#150d24',
      card: '#22123b',
      border: '#361761',
      text: '#faf5ff',
      textMuted: '#a855f7',
      accent: '#00f0ff',
      bubbleSelf: '#4c1d95',
      bubbleOther: '#22123b',
      nameSelf: '#22d3ee',
      nameOther: '#a855f7',
    }
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    mode: 'dark',
    colors: {
      background: '#04140e',
      sidebar: '#062319',
      card: '#0a3627',
      border: '#104a37',
      text: '#f0fdf4',
      textMuted: '#86efac',
      accent: '#10b981',
      bubbleSelf: '#065f46',
      bubbleOther: '#0a3627',
      nameSelf: '#34d399',
      nameOther: '#86efac',
    }
  },
  {
    id: 'crimson-nocturne',
    name: 'Crimson Nocturne',
    mode: 'dark',
    colors: {
      background: '#140505',
      sidebar: '#200808',
      card: '#310c0c',
      border: '#491212',
      text: '#fef2f2',
      textMuted: '#fca5a5',
      accent: '#ef4444',
      bubbleSelf: '#991b1b',
      bubbleOther: '#310c0c',
      nameSelf: '#f87171',
      nameOther: '#fca5a5',
    }
  },
  {
    id: 'amethyst-void',
    name: 'Amethyst Void',
    mode: 'dark',
    colors: {
      background: '#0b0614',
      sidebar: '#130a24',
      card: '#21113c',
      border: '#341a5d',
      text: '#f5f3ff',
      textMuted: '#c4b5fd',
      accent: '#8b5cf6',
      bubbleSelf: '#5b21b6',
      bubbleOther: '#21113c',
      nameSelf: '#a78bfa',
      nameOther: '#c4b5fd',
    }
  },
  {
    id: 'solar-ember',
    name: 'Solar Ember',
    mode: 'dark',
    colors: {
      background: '#140c04',
      sidebar: '#211306',
      card: '#331f0b',
      border: '#4d2e11',
      text: '#fffbeb',
      textMuted: '#fcd34d',
      accent: '#f59e0b',
      bubbleSelf: '#92400e',
      bubbleOther: '#331f0b',
      nameSelf: '#fbbf24',
      nameOther: '#fcd34d',
    }
  },
  {
    id: 'slate-steel',
    name: 'Slate Steel',
    mode: 'dark',
    colors: {
      background: '#0f172a',
      sidebar: '#1e293b',
      card: '#334155',
      border: '#475569',
      text: '#f8fafc',
      textMuted: '#cbd5e1',
      accent: '#38bdf8',
      bubbleSelf: '#2563eb',
      bubbleOther: '#334155',
      nameSelf: '#7dd3fc',
      nameOther: '#cbd5e1',
    }
  },
  {
    id: 'obsidian-matte',
    name: 'Obsidian Matte',
    mode: 'dark',
    colors: {
      background: '#121212',
      sidebar: '#1a1a1a',
      card: '#242424',
      border: '#333333',
      text: '#f5f5f5',
      textMuted: '#a3a3a3',
      accent: '#d4d4d4',
      bubbleSelf: '#404040',
      bubbleOther: '#262626',
      nameSelf: '#ffffff',
      nameOther: '#a3a3a3',
    }
  },
  {
    id: 'ocean-trench',
    name: 'Ocean Trench',
    mode: 'dark',
    colors: {
      background: '#021a24',
      sidebar: '#04293a',
      card: '#064460',
      border: '#0a5b80',
      text: '#ecfeff',
      textMuted: '#67e8f9',
      accent: '#06b6d4',
      bubbleSelf: '#0e7490',
      bubbleOther: '#064460',
      nameSelf: '#22d3ee',
      nameOther: '#67e8f9',
    }
  },

  // 10 LIGHT MODE SCHEMES
  {
    id: 'cloud-white',
    name: 'Cloud White',
    mode: 'light',
    colors: {
      background: '#f8fafc',
      sidebar: '#f1f5f9',
      card: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      textMuted: '#64748b',
      accent: '#0284c7',
      bubbleSelf: '#dbeafe',
      bubbleOther: '#f1f5f9',
      nameSelf: '#1d4ed8',
      nameOther: '#64748b',
    }
  },
  {
    id: 'soft-indigo',
    name: 'Soft Indigo',
    mode: 'light',
    colors: {
      background: '#f5f7ff',
      sidebar: '#eef2ff',
      card: '#ffffff',
      border: '#e0e7ff',
      text: '#1e1b4b',
      textMuted: '#6366f1',
      accent: '#4f46e5',
      bubbleSelf: '#e0e7ff',
      bubbleOther: '#f3f4f6',
      nameSelf: '#4338ca',
      nameOther: '#6b7280',
    }
  },
  {
    id: 'mint-fresh',
    name: 'Mint Fresh',
    mode: 'light',
    colors: {
      background: '#f0fdf4',
      sidebar: '#dcfce7',
      card: '#ffffff',
      border: '#bbf7d0',
      text: '#052e16',
      textMuted: '#16a34a',
      accent: '#15803d',
      bubbleSelf: '#dcfce7',
      bubbleOther: '#f4fbf6',
      nameSelf: '#166534',
      nameOther: '#64748b',
    }
  },
  {
    id: 'warm-peach',
    name: 'Warm Peach',
    mode: 'light',
    colors: {
      background: '#fff7ed',
      sidebar: '#ffedd5',
      card: '#ffffff',
      border: '#fed7aa',
      text: '#431407',
      textMuted: '#ea580c',
      accent: '#c2410c',
      bubbleSelf: '#ffedd5',
      bubbleOther: '#fafaf9',
      nameSelf: '#9a3412',
      nameOther: '#78716c',
    }
  },
  {
    id: 'amber-glow',
    name: 'Amber Glow',
    mode: 'light',
    colors: {
      background: '#fffbeb',
      sidebar: '#fef3c7',
      card: '#ffffff',
      border: '#fde68a',
      text: '#451a03',
      textMuted: '#b45309',
      accent: '#d97706',
      bubbleSelf: '#fef3c7',
      bubbleOther: '#fffdf5',
      nameSelf: '#92400e',
      nameOther: '#78716c',
    }
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    mode: 'light',
    colors: {
      background: '#faf5ff',
      sidebar: '#f3e8ff',
      card: '#ffffff',
      border: '#e9d5ff',
      text: '#2e1065',
      textMuted: '#9333ea',
      accent: '#7e22ce',
      bubbleSelf: '#f3e8ff',
      bubbleOther: '#faf5ff',
      nameSelf: '#6b21a8',
      nameOther: '#6b7280',
    }
  },
  {
    id: 'golden-sunbeam',
    name: 'Golden Sunbeam',
    mode: 'light',
    colors: {
      background: '#fefce8',
      sidebar: '#fef9c3',
      card: '#ffffff',
      border: '#fef08a',
      text: '#422006',
      textMuted: '#ca8a04',
      accent: '#a16207',
      bubbleSelf: '#fef9c3',
      bubbleOther: '#fbfbf8',
      nameSelf: '#854d0e',
      nameOther: '#71717a',
    }
  },
  {
    id: 'nordic-glacier',
    name: 'Nordic Glacier',
    mode: 'light',
    colors: {
      background: '#f0f9ff',
      sidebar: '#e0f2fe',
      card: '#ffffff',
      border: '#bae6fd',
      text: '#082f49',
      textMuted: '#0284c7',
      accent: '#0369a1',
      bubbleSelf: '#bae6fd',
      bubbleOther: '#f0f9ff',
      nameSelf: '#075985',
      nameOther: '#64748b',
    }
  },
  {
    id: 'desert-sand',
    name: 'Desert Sand',
    mode: 'light',
    colors: {
      background: '#fafaf9',
      sidebar: '#f5f5f4',
      card: '#ffffff',
      border: '#e7e5e4',
      text: '#1c1917',
      textMuted: '#78716c',
      accent: '#57534e',
      bubbleSelf: '#e7e5e4',
      bubbleOther: '#ffffff',
      nameSelf: '#292524',
      nameOther: '#78716c',
    }
  },
  {
    id: 'teal-breeze',
    name: 'Teal Breeze',
    mode: 'light',
    colors: {
      background: '#f0fdfa',
      sidebar: '#ccfbf1',
      card: '#ffffff',
      border: '#99f6e4',
      text: '#042f2e',
      textMuted: '#0d9488',
      accent: '#0f766e',
      bubbleSelf: '#ccfbf1',
      bubbleOther: '#ffffff',
      nameSelf: '#115e59',
      nameOther: '#64748b',
    }
  }
];

export function applyThemeToDOM(colors: CustomColors) {
  const root = document.documentElement;
  root.style.setProperty('--bg-app', colors.background);
  root.style.setProperty('--bg-sidebar', colors.sidebar);
  root.style.setProperty('--bg-card', colors.card);
  root.style.setProperty('--border-app', colors.border);
  root.style.setProperty('--text-primary', colors.text);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--bubble-self', colors.bubbleSelf);
  root.style.setProperty('--bubble-other', colors.bubbleOther);
  root.style.setProperty('--name-self', colors.nameSelf);
  root.style.setProperty('--name-other', colors.nameOther);
}
