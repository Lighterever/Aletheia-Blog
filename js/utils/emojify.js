/**
 * Tiny emoji preprocessor — converts :shortcode: to unicode emoji.
 * Works both in Node.js and browser (as global when included via <script>).
 */

const EMOJI_MAP = {
    'smile': '😄', 'laughing': '😆', 'joy': '😂', 'rofl': '🤣',
    'smiley': '😃', 'grin': '😁', 'wink': '😉', 'blush': '😊',
    'heart_eyes': '😍', 'kissing_heart': '😘', 'hugging': '🤗',
    'thinking': '🤔', 'neutral_face': '😐', 'expressionless': '😑',
    'unamused': '😒', 'roll_eyes': '🙄', 'grimacing': '😬',
    'sweat_smile': '😅', 'cold_sweat': '😰', 'scream': '😱',
    'flushed': '😳', 'sleeping': '😴', 'dizzy_face': '😵',
    'rage': '😡', 'angry': '😠', 'cry': '😢', 'sob': '😭',
    'sunglasses': '😎', 'nerd': '🤓', 'monocle': '🧐',
    'rocket': '🚀', 'sparkles': '✨', 'star': '⭐', 'star2': '🌟',
    'zap': '⚡', 'fire': '🔥', 'boom': '💥', 'tada': '🎉',
    'heart': '❤️', 'blue_heart': '💙', 'green_heart': '💚',
    'yellow_heart': '💛', 'purple_heart': '💜', 'broken_heart': '💔',
    '100': '💯', 'bulb': '💡', 'memo': '📝', 'pencil': '✏️',
    'book': '📖', 'books': '📚', 'lock': '🔒', 'key': '🔑',
    'mag': '🔍', 'pin': '📌', 'link': '🔗', 'scissors': '✂️',
    'hammer': '🔨', 'wrench': '🔧', 'gear': '⚙️',
    'check': '✅', 'x': '❌', 'warning': '⚠️', 'question': '❓',
    'exclamation': '❗', 'info': 'ℹ️', 'no_entry': '⛔',
    'arrow_up': '⬆️', 'arrow_down': '⬇️', 'arrow_left': '⬅️',
    'arrow_right': '➡️', 'arrows_clockwise': '🔄',
    'package': '📦', 'inbox_tray': '📥', 'outbox_tray': '📤',
    'email': '📧', 'phone': '📞', 'calendar': '📅', 'clock': '🕐',
    'computer': '💻', 'keyboard': '⌨️', 'mouse': '🖱️',
    'art': '🎨', 'music': '🎵', 'movie': '🎬', 'camera': '📷',
    'earth_africa': '🌍', 'sunny': '☀️', 'cloud': '☁️',
    'rainbow': '🌈', 'ocean': '🌊', 'mountain': '⛰️', 'seedling': '🌱',
    'coffee': '☕', 'pizza': '🍕', 'cake': '🍰', 'cookie': '🍪',
    'medal': '🏅', 'trophy': '🏆', 'crown': '👑', 'gem': '💎',
    '+1': '👍', '-1': '👎', 'clap': '👏', 'pray': '🙏',
    'ok_hand': '👌', 'muscle': '💪', 'wave': '👋',
};

const EMOJI_REGEX = /:([a-z0-9_+-]+):/gi;

function emojify(text) {
    if (!text) return text;
    return text.replace(EMOJI_REGEX, (match, name) => {
        return EMOJI_MAP[name.toLowerCase()] || match;
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { emojify };
} else if (typeof window !== 'undefined') {
    window.emojify = emojify;
}
