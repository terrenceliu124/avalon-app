import { getAvatar } from '../assets';

export default function PlayerAvatar({ name, size = 32 }) {
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
