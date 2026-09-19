export function clampRotation(value: number, maximum = 8) {
  return Math.max(-maximum, Math.min(maximum, value));
}

export function rotationFromPointer(x: number, y: number, width: number, height: number, maximum = 8) {
  if (width <= 0 || height <= 0) return { rotateX: 0, rotateY: 0 };
  const rotateX = clampRotation(-((y / height) * 2 - 1) * maximum, maximum);
  const rotateY = clampRotation(((x / width) * 2 - 1) * maximum, maximum);
  return { rotateX: Object.is(rotateX, -0) ? 0 : rotateX, rotateY: Object.is(rotateY, -0) ? 0 : rotateY };
}
