'use client';

import React, { useEffect, useState } from 'react';

export type TextureMode = 'halftone' | 'fiber' | 'wash';

interface TextureSelectorProps {
  variant?: 'dots' | 'pills';
  className?: string;
}

const TEXTURES: { id: TextureMode; label: string; number: string; title: string }[] = [
  { id: 'halftone', label: 'Halftone Dot', number: '1', title: '1. Halftone Dot Texture' },
  { id: 'fiber', label: 'Paper Fiber', number: '2', title: '2. Paper Fiber Texture' },
  { id: 'wash', label: 'Newsprint Wash', number: '3', title: '3. Newsprint Wash Texture' },
];

export function TextureSelector({ variant = 'dots', className = '' }: TextureSelectorProps) {
  const [texture, setTexture] = useState<TextureMode>('halftone');

  useEffect(() => {
    const saved = window.localStorage.getItem('dakhbar_texture_choice') as TextureMode | null;
    const initial = saved && ['halftone', 'fiber', 'wash'].includes(saved) ? saved : 'halftone';
    setTexture(initial);
    document.body.setAttribute('data-texture', initial);
    document.documentElement.setAttribute('data-texture', initial);
  }, []);

  const selectTexture = (mode: TextureMode) => {
    setTexture(mode);
    window.localStorage.setItem('dakhbar_texture_choice', mode);
    document.body.setAttribute('data-texture', mode);
    document.documentElement.setAttribute('data-texture', mode);
  };

  if (variant === 'dots') {
    return (
      <div className={`texture-dots-bar ${className}`.trim()} role="group" aria-label="Paper Texture Selector">
        <span className="texture-dots-label" title="Broadsheet Paper Texture">Texture:</span>
        <div className="texture-dots-list">
          {TEXTURES.map(item => {
            const isActive = texture === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTexture(item.id)}
                className={`texture-dot-node texture-dot-${item.id} ${isActive ? 'active' : ''}`}
                title={item.title}
                aria-label={item.title}
                aria-pressed={isActive}
              >
                <span className="texture-dot-inner" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`texture-explorer-bar ${className}`.trim()} aria-label="Background Texture Explorer">
      <span className="texture-label">Texture:</span>
      <div className="texture-pills">
        {TEXTURES.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTexture(item.id)}
            className={`texture-pill-btn ${texture === item.id ? 'active' : ''}`}
            aria-pressed={texture === item.id}
          >
            {item.number}. {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

