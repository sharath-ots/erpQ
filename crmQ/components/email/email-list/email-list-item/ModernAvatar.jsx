import { Avatar } from '@mui/material';

// 🚀 Professional SaaS Gradients
const gradients = [
    'linear-gradient(135deg, #3A1C71 0%, #D76D77 50%, #FFAF7B 100%)', // Warm Sunset
    'linear-gradient(135deg, #1CB5E0 0%, #000851 100%)', // Deep Ocean
    'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)', // Mint Breeze
    'linear-gradient(135deg, #fc4a1a 0%, #f7b733 100%)', // Flame
    'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Emerald
    'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)', // Cosmic Purple
    'linear-gradient(135deg, #F2994A 0%, #F2C94C 100%)', // Golden
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Soft Violet
];

// 🚀 Smart Initial Extractor (Handles "first.last", "first_last", or "singleword")
const getInitials = (name = "") => {
    const clean = name.replace(/[^a-zA-Z0-9.\s_-]/g, '').trim();
    const parts = clean.split(/[\s._-]+/);

    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.substring(0, 2).toUpperCase();
};

// 🚀 Hash function to guarantee the same sender always gets the same gradient
const getGradient = (name = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
};

const ModernAvatar = ({ name, size = 40, sx = {} }) => {
    const initials = getInitials(name);
    const background = getGradient(name);

    return (
        <Avatar
            sx={{
                width: size,
                height: size,
                background: background,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: size * 0.4,
                letterSpacing: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', // Premium soft shadow
                ...sx
            }}
        >
            {initials}
        </Avatar>
    );
};

export default ModernAvatar;