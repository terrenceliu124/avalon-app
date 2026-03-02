import { getAvatar } from '../assets';

export default function PlayerAvatar({ name, emoji, size = 32 }) {
  if (emoji) {
    return <span className="emoji-avatar">{emoji}</span>;
  }
  const src = getAvatar(name);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={name}
      className="player-avatar"
      style={{ width: size, height: size }}
    />
  );
}
