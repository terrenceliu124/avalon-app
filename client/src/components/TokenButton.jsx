import React from 'react';

export default function TokenButton({ src, alt, onClick, selected, isPending }) {
  if (isPending) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: 90,
          opacity: selected ? 1 : 0.3,
          boxShadow: selected ? '0 0 0 3px #fff' : 'none',
          borderRadius: 8,
          cursor: 'default',
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      style={{ width: 90, cursor: 'pointer', borderRadius: 8, transition: 'transform 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    />
  );
}
