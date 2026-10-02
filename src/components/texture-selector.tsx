'use client';

import React, { useEffect, useState } from 'react';

type TextureMode = 'halftone' | 'fiber' | 'wash';

export function TextureSelector() {
  const [texture, setTexture] = useState<TextureMode>('halftone');

  useEffect(() => {
    const saved = window.localStorage.getItem('dakhbar_texture_choice') as TextureMode | null;
    const initial = saved && ['halftone', 'fiber', 'wash'].includes(saved) ? saved : 'halftone';
    setTexture(initial);
    document.body.setAttribute('data-texture', initial);
  }, []);

  const selectTexture = (mode: TextureMode) => {
    setTexture(mode);
    window.localStorage.setItem('dakhbar_texture_choice', mode);
    document.body.setAttribute('data-texture', mode);
  };

  return (
    <div className="texture-explorer-bar" aria-label="Background Texture Explorer">
      <span className="texture-label">Texture:</span>
      <div className="texture-pills">
        <button
          type="button"
          onClick={() => selectTexture('halftone')}
          className={`texture-pill-btn ${texture === 'halftone' ? 'active' : ''}`}
          aria-pressed={texture === 'halftone'}
        >
          1. Halftone Dot
        </button>
        <button
          type="button"
          onClick={() => selectTexture('fiber')}
          className={`texture-pill-btn ${texture === 'fiber' ? 'active' : ''}`}
          aria-pressed={texture === 'fiber'}
        >
          2. Paper Fiber
        </button>
        <button
          type="button"
          onClick={() => selectTexture('wash')}
          className={`texture-pill-btn ${texture === 'wash' ? 'active' : ''}`}
          aria-pressed={texture === 'wash'}
        >
          3. Newsprint Wash
        </button>
      </div>
    </div>
  );
}
